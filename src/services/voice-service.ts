import { EdgeTTS } from '@andresaya/edge-tts';
import { logger } from '../config/logger.js';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female';
  accent: string;
  description: string;
}

export const ZYRA_FEMALE_VOICES: VoiceOption[] = [
  {
    id: 'en-US-AriaNeural',
    name: 'Zyra Prime (Aria)',
    gender: 'Female',
    accent: 'American (Clear & Intelligent)',
    description: 'Crisp, confident, and professional assistant tone. Recommended default.',
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Zyra Expressive (Jenny)',
    gender: 'Female',
    accent: 'American (Warm & Friendly)',
    description: 'Natural, conversational, and warm tone.',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Zyra Elegant (Sonia)',
    gender: 'Female',
    accent: 'British (Sophisticated & Crisp)',
    description: 'Refined, calm, British accent inspired by Friday/Jarvis assistants.',
  },
  {
    id: 'en-US-AnaNeural',
    name: 'Zyra Gentle (Ana)',
    gender: 'Female',
    accent: 'American (Soft & Calm)',
    description: 'Soft-spoken, relaxed, and calm demeanor.',
  },
];

export class VoiceService {
  private defaultVoice = 'en-US-AriaNeural';

  /**
   * Generates MP3 audio buffer from text using neural voice synthesis.
   */
  async synthesize(
    text: string,
    voice: string = this.defaultVoice,
    pitch: string = '+0Hz',
    rate: string = '+0%'
  ): Promise<Buffer> {
    try {
      const tts = new EdgeTTS();
      logger.debug(`Synthesizing speech with voice ${voice}: "${text.slice(0, 40)}..."`);

      await tts.synthesize(text, voice, {
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
   * Returns available curated female voices for Zyra.
   */
  getAvailableVoices(): VoiceOption[] {
    return ZYRA_FEMALE_VOICES;
  }
}

export const voiceService = new VoiceService();
