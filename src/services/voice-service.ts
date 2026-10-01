import { EdgeTTS } from '@andresaya/edge-tts';
import { logger } from '../config/logger.js';

export const ZYRA_VOICE_ID = 'en-GB-SoniaNeural';
export const DEFAULT_SPEECH_RATE = '+14%';

export class VoiceService {
  public readonly voiceId = ZYRA_VOICE_ID;
  public readonly defaultRate = DEFAULT_SPEECH_RATE;
  private audioCache = new Map<string, Buffer>();
  private maxCacheEntries = 200;
  private activeSyntheses = 0;
  private maxConcurrentSyntheses = 3;
  private slotQueue: Array<() => void> = [];

  private async acquireSlot(): Promise<void> {
    if (this.activeSyntheses < this.maxConcurrentSyntheses) {
      this.activeSyntheses++;
      return;
    }
    return new Promise((resolve) => {
      this.slotQueue.push(() => {
        this.activeSyntheses++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.activeSyntheses--;
    if (this.slotQueue.length > 0) {
      const next = this.slotQueue.shift();
      if (next) next();
    }
  }

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
    const speechText = this.cleanForSpeech(text);
    if (!speechText) {
      return Buffer.alloc(0);
    }

    // 1. Check in-memory audio cache for zero-latency playback (instant, lock-free)
    const cacheKey = `${voice}:${rate}:${pitch}:${speechText}`;
    const cached = this.audioCache.get(cacheKey);
    if (cached) {
      logger.debug(`Audio cache hit for "${speechText.slice(0, 30)}..."`);
      return cached;
    }

    // 2. Concurrency-managed synthesis pool (allows up to 3 parallel requests)
    // Prefetches sentences in parallel so consecutive speech plays without buffer underruns
    await this.acquireSlot();
    try {
      const cachedAgain = this.audioCache.get(cacheKey);
      if (cachedAgain) return cachedAgain;

      let lastError: unknown;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const tts = new EdgeTTS();
          logger.debug(`Synthesizing Zyra speech (attempt ${attempt}, rate: ${rate}): "${speechText.slice(0, 50)}..."`);

          const synthPromise = (async () => {
            await tts.synthesize(speechText, voice || this.voiceId, {
              pitch,
              rate: rate || this.defaultRate,
              volume: '+0%',
            });
            return tts.toBuffer();
          })();

          // 15-second timeout guard per attempt
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('EdgeTTS synthesis timed out after 15000ms')), 15000)
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
          lastError = error;
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`Voice synthesis attempt ${attempt} failed: ${msg}`);
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }

      const finalMsg = lastError instanceof Error ? lastError.message : String(lastError);
      logger.error('Voice synthesis failed after retries:', { error: finalMsg });
      throw new Error(`TTS synthesis error: ${finalMsg}`);
    } finally {
      this.releaseSlot();
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
