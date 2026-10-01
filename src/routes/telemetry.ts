import { Router } from 'express';
import { telemetryService } from '../container.js';

export const telemetryRouter = Router();

/**
 * @route GET /api/v1/telemetry/nodes
 * @description Returns comprehensive real-time telemetry across the model network and hardware nodes.
 */
telemetryRouter.get('/nodes', async (_req, res, next) => {
  try {
    const [hardware, model] = await Promise.all([
      telemetryService.getHardwareTelemetry(),
      telemetryService.getModelNodeTelemetry(),
    ]);

    const recentTraces = telemetryService.getRecentTraces(10);

    res.json({
      status: 'ok',
      hardware,
      model,
      recentTraces,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/telemetry/latest
 * @description Returns the single most recent pipeline trace.
 */
telemetryRouter.get('/latest', (_req, res) => {
  const traces = telemetryService.getRecentTraces(1);
  res.json({
    trace: traces[0] || null,
  });
});
