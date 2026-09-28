import { Router } from 'express';
import { z } from 'zod';
import { voiceService } from '../services/voice-service.js';

export const voiceRouter = Router();

const ttsQuerySchema = z.object({
  text: z.string().trim().min(1, 'Text parameter is required').max(1000, 'Text exceeds maximum limit of 1000 characters'),
  voice: z.string().max(100).optional(),
  pitch: z.string().max(20).optional(),
  rate: z.string().max(20).optional(),
});

/**
 * @route GET /api/v1/voice/info
 * @description Returns information about Zyra's unique voice.
 */
voiceRouter.get('/info', (_req, res) => {
  res.json({
    voice: voiceService.getVoiceInfo(),
  });
});

// Also keep /voices for backwards compatibility returning Zyra
voiceRouter.get('/voices', (_req, res) => {
  res.json({
    voices: [voiceService.getVoiceInfo()],
  });
});

/**
 * @route GET /api/v1/voice/tts
 * @description Generates and streams Zyra's unique neural speech audio.
 */
voiceRouter.get('/tts', async (req, res, next) => {
  try {
    const { text, voice, pitch, rate } = ttsQuerySchema.parse(req.query);

    const audioBuffer = await voiceService.synthesize(
      text,
      voice || voiceService.voiceId,
      pitch || '+0Hz',
      rate || voiceService.defaultRate
    );

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(audioBuffer);
  } catch (error) {
    next(error);
  }
});
