/**
 * @file Express application factory for Zyra Assistant.
 */
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { routes } from './routes/index.js';

/**
 * Creates and configures the Express application.
 * @returns The configured Express application
 */
export function createApp(): Express {
    const app = express();

    // Core security and parsing middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Request logging middleware
    app.use(requestLogger);

    // Mount API v1 routes
    app.use('/api/v1', routes);

    // Global error handler middleware
    app.use(errorHandler);

    return app;
}
