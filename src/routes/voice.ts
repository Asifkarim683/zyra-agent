import { Router } from 'express';
import { z } from 'zod';
import { voiceService } from '../services/voice-service.js';

export const voiceRouter = Router();

const ttsQuerySchema = z.object({
  text: z.string().min(1, 'Text parameter is required'),
  voice: z.string().optional(),
  pitch: z.string().optional(),
  rate: z.string().optional(),
});

/**
 * @route GET /api/v1/voice/voices
 * @description Lists curated unique female voices for Zyra.
 */
voiceRouter.get('/voices', (_req, res) => {
  res.json({
    voices: voiceService.getAvailableVoices(),
  });
});

/**
 * @route GET /api/v1/voice/tts
 * @description Generates and streams neural speech MP3 audio for the given text.
 */
voiceRouter.get('/tts', async (req, res, next) => {
  try {
    const { text, voice, pitch, rate } = ttsQuerySchema.parse(req.query);

    const audioBuffer = await voiceService.synthesize(
      text,
      voice,
      pitch || '+0Hz',
      rate || '+0%'
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
});
