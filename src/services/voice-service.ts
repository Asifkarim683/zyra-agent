import { EdgeTTS } from '@andresaya/edge-tts';
import { logger } from '../config/logger.js';

export const ZYRA_VOICE_ID = 'en-GB-SoniaNeural';
export const DEFAULT_SPEECH_RATE = '+14%';

export class VoiceService {
  public readonly voiceId = ZYRA_VOICE_ID;
  public readonly defaultRate = DEFAULT_SPEECH_RATE;
  private audioCache = new Map<string, Buffer>();
  private maxCacheEntries = 200;

  /**
   * Prepares and cleans text for natural, fluid human speech.
   * Strips robotic characters, expands symbols, and prevents unnatural pauses.
   */
  public cleanForSpeech(text: string): string {
    return (
      text
        // Remove code blocks and inline code
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]+`/g, '')
        // Remove URLs
        .replace(/https?:\/\/\S+/g, '')
        // Remove markdown formatting
        .replace(/[*#_~>]/g, '')
        // Remove reference tags like [1], [2], [source]
        .replace(/\[\d+\]|\[.*?\]/g, '')
        // Remove stock tickers or parentheses like (AAPL) or (USD)
        .replace(/\([A-Z0-9.\s-]{1,10}\)/g, '')
        // Expand measurement units & symbols to spoken words
        .replace(/(\d+)\s*°C\b/gi, '$1 degrees')
        .replace(/(\d+)\s*°F\b/gi, '$1 degrees Fahrenheit')
        .replace(/(\d+)%\b/g, '$1 percent')
        .replace(/\bkm\/h\b/gi, 'kilometers an hour')
        .replace(/\bmph\b/gi, 'miles an hour')
        .replace(/\bUSD\b/g, 'dollars')
        .replace(/\bGBP\b/g, 'pounds')
        .replace(/\bEUR\b/g, 'euros')
        .replace(/\$([0-9,.]+)/g, '$1 dollars')
        .replace(/&/g, ' and ')
        // Remove timezone abbreviations that cause awkward stuttering
        .replace(/\b(?:GMT[+-]\d+|JST|UTC[+-]\d+|EST|PST|CST)\b/g, '')
        // Remove parentheses around regular text so speech doesn't hesitate
        .replace(/\(([^)]+)\)/g, ', $1,')
        // Replace bullets or list numbers with gentle pauses
        .replace(/^\s*[-*•]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // Normalize ellipses and duplicate punctuation that trigger prolonged pauses
        .replace(/\.{2,}/g, '.')
        .replace(/,{2,}/g, ',')
        .replace(/!{2,}/g, '!')
        .replace(/\?{2,}/g, '?')
        .replace(/\s*([,.:;?!])\s*/g, '$1 ')
        // Collapse multiple spaces and newlines
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Generates MP3 audio buffer from text using Zyra's unique neural voice.
   * Optimized with human conversational pacing (+14% speed) and prosody cleaning.
   */
  async synthesize(
    text: string,
    voice: string = this.voiceId,
    pitch: string = '+0Hz',
    rate: string = this.defaultRate
  ): Promise<Buffer> {
    try {
      const speechText = this.cleanForSpeech(text);
      if (!speechText) {
        throw new Error('Empty text after speech sanitization');
      }

      // Check in-memory audio cache for zero-latency playback
      const cacheKey = `${voice}:${rate}:${pitch}:${speechText}`;
      const cached = this.audioCache.get(cacheKey);
      if (cached) {
        logger.debug(`Audio cache hit for "${speechText.slice(0, 30)}..."`);
        return cached;
      }

      const tts = new EdgeTTS();
      logger.debug(`Synthesizing Zyra speech (rate: ${rate}): "${speechText.slice(0, 50)}..."`);

      const synthPromise = (async () => {
        await tts.synthesize(speechText, voice || this.voiceId, {
          pitch,
          rate: rate || this.defaultRate,
          volume: '+0%',
        });
        return tts.toBuffer();
      })();

      // 4-second timeout guard to prevent WebSocket hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('EdgeTTS synthesis timed out after 4000ms')), 4000)
      );

      const buffer = await Promise.race([synthPromise, timeoutPromise]);

      // Cache synthesized audio buffer (evict oldest if full)
      if (this.audioCache.size >= this.maxCacheEntries) {
        const oldestKey = this.audioCache.keys().next().value;
        if (oldestKey) this.audioCache.delete(oldestKey);
      }
      this.audioCache.set(cacheKey, buffer);

      return buffer;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Voice synthesis failed:', { error: msg });
      throw new Error(`TTS synthesis error: ${msg}`);
    }
  }

  /**
   * Returns metadata for Zyra's exclusive voice.
   */
  getVoiceInfo() {
    return {
      id: this.voiceId,
      name: 'Zyra',
      gender: 'Female',
      accent: 'British (Natural & Conversational)',
      description: "Zyra's unique voice persona.",
      defaultRate: this.defaultRate,
    };
  }
}

export const voiceService = new VoiceService();
