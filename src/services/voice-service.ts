import { EdgeTTS } from '@andresaya/edge-tts';
import { logger } from '../config/logger.js';

export const ZYRA_VOICE_ID = 'en-GB-SoniaNeural';

export class VoiceService {
  public readonly voiceId = ZYRA_VOICE_ID;

  /**
   * Generates MP3 audio buffer from text using Zyra's unique neural voice.
   */
  async synthesize(
    text: string,
    voice: string = this.voiceId,
    pitch: string = '+0Hz',
    rate: string = '+0%'
  ): Promise<Buffer> {
    try {
      const tts = new EdgeTTS();
      logger.debug(`Synthesizing Zyra speech: "${text.slice(0, 40)}..."`);

      await tts.synthesize(text, voice || this.voiceId, {
        pitch,
        rate,
        volume: '+0%',
      });

      return tts.toBuffer();
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
      accent: 'British (Sophisticated & Calm)',
      description: "Zyra's unique voice persona.",
    };
  }
}

export const voiceService = new VoiceService();
