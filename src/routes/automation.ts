import { Router } from 'express';
import { z } from 'zod';
import { systemAutomationService, databaseService } from '../container.js';

export const automationRouter = Router();

const actionIdSchema = z.object({
  actionId: z.string().max(50).optional(),
});

/**
 * @route GET /api/v1/automation/pending
 * @description Returns the currently staged automation action waiting for confirmation.
 */
automationRouter.get('/pending', (_req, res) => {
  const pending = systemAutomationService.getPendingAction();
  res.json({ pending });
});

/**
 * @route POST /api/v1/automation/confirm
 * @description Confirms and executes the currently staged automation action.
 */
automationRouter.post('/confirm', (req, res, next) => {
  try {
    const { actionId } = actionIdSchema.parse(req.body || {});
    const result = systemAutomationService.confirmAction(actionId);

    if (!result.success) {
      res.status(400).json({ error: result.message, status: 400 });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      target: result.target,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/v1/automation/cancel
 * @description Cancels the currently staged automation action.
 */
automationRouter.post('/cancel', (req, res, next) => {
  try {
    const { actionId } = actionIdSchema.parse(req.body || {});
    const result = systemAutomationService.cancelAction(actionId);

    if (!result.success) {
      res.status(400).json({ error: result.message, status: 400 });
      return;
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/v1/automation/audit
 * @description Retrieves recent automation audit records.
 */
automationRouter.get('/audit', (_req, res) => {
  const logs = databaseService.getAutomationAuditLogs(20);
  res.json({ logs });
});
