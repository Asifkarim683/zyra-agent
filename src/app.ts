/**
 * @file Express application factory for Zyra Assistant.
 */
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
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
    app.use(
        helmet({
            contentSecurityPolicy: false, // Allow inline styles and font imports in dashboard
        })
    );
    app.use(cors());
    app.use(express.json({ limit: '500kb' }));
    app.use(express.urlencoded({ extended: true, limit: '500kb' }));

    // Request logging middleware
    app.use(requestLogger);

    // Mount API v1 routes
    app.use('/api/v1', routes);

    // Serve dedicated model network monitor page
    const monitorFile = path.resolve(process.cwd(), 'public/monitor.html');
    app.get('/monitor', (_req, res) => {
        if (fs.existsSync(monitorFile)) {
            res.sendFile(monitorFile);
        } else {
            res.status(404).send('Monitor dashboard not found');
        }
    });
    app.use('/public', express.static(path.resolve(process.cwd(), 'public')));

    // Serve built client dashboard if client/dist exists
    const clientDist = path.resolve(process.cwd(), 'client/dist');
    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path === '/monitor') return next();
            res.sendFile(path.join(clientDist, 'index.html'));
        });
    }

    // Global error handler middleware
    app.use(errorHandler);

    return app;
}
