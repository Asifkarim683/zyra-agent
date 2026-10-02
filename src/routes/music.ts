import { Router } from 'express';
import { z } from 'zod';
import { musicService } from '../container.js';

export const musicRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().min(1, 'Search query cannot be empty'),
  platform: z.enum(['youtube', 'spotify']).default('youtube'),
});

const playSchema = z.object({
  query: z.string().trim().min(1, 'Query cannot be empty'),
  platform: z.enum(['youtube', 'spotify']).optional(),
});

const controlSchema = z.object({
  action: z.enum(['pause', 'resume', 'stop', 'next', 'previous', 'volume']),
  value: z.any().optional(),
});

/**
 * @route GET /api/v1/music/search
 * @description Searches music tracks across YouTube or Spotify.
 */
musicRouter.get('/search', async (req, res, next) => {
  try {
    const { q, platform } = searchSchema.parse(req.query);
    const tracks =
      platform === 'spotify'
        ? await musicService.searchSpotify(q)
        : await musicService.searchYouTube(q);

    res.json({
      success: true,
      query: q,
      platform,
      tracks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/music/state
 * @description Returns current music player state.
 */
musicRouter.get('/state', (_req, res) => {
  res.json({
    success: true,
    state: musicService.getState(),
  });
});

/**
 * @route POST /api/v1/music/play
 * @description Searches and sets active track for playback.
 */
musicRouter.post('/play', async (req, res, next) => {
  try {
    const { query, platform } = playSchema.parse(req.body);
    const track = await musicService.play(query, platform);
    res.json({
      success: true,
      track,
      state: musicService.getState(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/music/control
 * @description Controls music playback (pause, resume, stop, next, volume).
 */
musicRouter.post('/control', (req, res, next) => {
  try {
    const { action, value } = controlSchema.parse(req.body);
    const state = musicService.control(action, value);
    res.json({
      success: true,
      state,
    });
  } catch (error) {
    next(error);
  }
});
