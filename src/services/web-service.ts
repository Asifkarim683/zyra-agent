import { logger } from '../config/logger.js';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface ExtractedWebpage {
  title: string;
  content: string;
  url: string;
}

/**
 * Service providing live internet search and web page text extraction.
 * Enables local LLMs to access real-time information without paid API keys.
 */
export class WebService {
  private userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

  /**
   * Cleans raw HTML into readable plain text.
   */
  private cleanHtml(html: string): string {
    return html
      // Remove scripts, styles, noscript, svg, navigation, headers, footers
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      // Replace block elements with newlines
      .replace(/<(?:p|div|h[1-6]|li|tr|section|article)[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove all remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#39;|&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n\n')
      .trim();
  }

  /**
   * Performs a live internet search using DuckDuckGo.
   * Falls back to Wikipedia search API if needed.
   *
   * @param query The search query string.
   * @param maxResults Maximum results to return (default: 5).
   * @returns Array of search results with titles, snippets, and URLs.
   */
  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    logger.info(`Performing live web search for: "${query}"`);
    const results: WebSearchResult[] = [];

    // 1. Try DuckDuckGo HTML search
    try {
      const response = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': this.userAgent,
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (response.ok) {
        const html = await response.text();

        // Extract result blocks
        // In DuckDuckGo HTML:
        // Snippets: <a class="result__snippet" ...>...</a>
        // Titles: <a class="result__url" ...> or <a class="result__snippet">
        const snippetMatches = [
          ...html.matchAll(
            /<a class="result__snippet"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
          ),
        ];

        for (const match of snippetMatches.slice(0, maxResults)) {
          let rawUrl = match[1] || '';
          // Decode DuckDuckGo redirect link uddg=
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            rawUrl = decodeURIComponent(uddgMatch[1]);
          }
          const snippet = this.cleanHtml(match[2] || '');

          if (snippet && snippet.length > 15) {
            // Find nearby title if possible
            results.push({
              title: query,
              snippet,
              url: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
            });
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`DuckDuckGo HTML search failed or timed out: ${msg}`);
    }

    // 2. If results are still empty, try DuckDuckGo Instant Answer JSON API
    if (results.length === 0) {
      try {
        const ddgApi = await fetch(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
          {
            headers: { 'User-Agent': this.userAgent },
            signal: AbortSignal.timeout(4000),
          }
        );
        if (ddgApi.ok) {
          const data = (await ddgApi.json()) as {
            AbstractText?: string;
            AbstractURL?: string;
            Heading?: string;
            RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
          };

          if (data.AbstractText) {
            results.push({
              title: data.Heading || query,
              snippet: data.AbstractText,
              url: data.AbstractURL || '',
            });
          }

          if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (const item of data.RelatedTopics.slice(
              0,
              maxResults - results.length
            )) {
              if (item.Text && item.FirstURL) {
                results.push({
                  title: item.Text.split(' - ')[0] || query,
                  snippet: item.Text,
                  url: item.FirstURL,
                });
              }
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`DuckDuckGo JSON API fallback failed: ${msg}`);
      }
    }

    // 3. Fallback: Wikipedia Search API for factual/encyclopedic searches
    if (results.length === 0) {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query
        )}&format=json&utf8=&srlimit=${maxResults}`;
        const wikiRes = await fetch(wikiUrl, {
          headers: { 'User-Agent': 'ZyraAssistant/1.0' },
          signal: AbortSignal.timeout(4000),
        });
        if (wikiRes.ok) {
          const wikiData = (await wikiRes.json()) as {
            query?: {
              search?: Array<{ title: string; snippet: string; pageid: number }>;
            };
          };
          if (wikiData.query?.search) {
            for (const item of wikiData.query.search) {
              results.push({
                title: item.title,
                snippet: this.cleanHtml(item.snippet),
                url: `https://en.wikipedia.org/?curid=${item.pageid}`,
              });
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Wikipedia search fallback failed: ${msg}`);
      }
    }

    logger.info(`Web search found ${results.length} results for: "${query}"`);
    return results;
  }

  /**
   * Fetches a web page by URL and extracts readable text.
   * Useful when user asks: "Extract data from https://..." or "Summarize https://..."
   *
   * @param url The web page URL to extract.
   * @param maxLength Max text length to return (default: 4000).
   * @returns Cleaned text content and page title.
   */
  async extractUrl(url: string, maxLength = 4000): Promise<ExtractedWebpage> {
    logger.info(`Extracting web content from URL: ${url}`);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const html = await response.text();

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? this.cleanHtml(titleMatch[1]) : url;

      // Extract and clean main content
      let content = this.cleanHtml(html);
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n...[Content Truncated]';
      }

      return {
        title,
        content,
        url,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to extract web content from ${url}: ${msg}`);
      throw new Error(`Unable to fetch or read webpage: ${msg}`);
    }
  }

  /**
   * Detects whether an input text contains a URL.
   */
  findUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"'{}|\^\[\]`]+/gi;
    return text.match(urlRegex) || [];
  }

  /**
   * Determines if a query requires live web search grounding.
   */
  shouldSearchWeb(query: string): boolean {
    const q = query.toLowerCase();

    // Explicit requests to search or lookup
    if (
      /^(?:search (?:for|the web for|online for)|look up|find online|browse the web for|google)\b/i.test(
        q
      )
    ) {
      return true;
    }

    // Explicit request to extract or read
    if (this.findUrls(query).length > 0) {
      return true;
    }

    // Questions about current live information, prices, sports, recent events
    const realTimeIndicators = [
      'latest',
      'recent',
      'today',
      'yesterday',
      'right now',
      'currently',
      'current price',
      'stock price',
      'share price',
      'bitcoin price',
      'crypto price',
      'who won',
      'match score',
      'news on',
      'news about',
      'breaking news',
      'weather in',
      'release date of',
      'who is the current',
      'who is the prime minister',
      'who is the president',
      '2024',
      '2025',
      '2026',
    ];

    return realTimeIndicators.some((indicator) => q.includes(indicator));
  }
}
