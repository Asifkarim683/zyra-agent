/**
 * @file Main entry point for Zyra Assistant.
 */
import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';

/**
 * Initializes and starts the server.
 */
async function startServer() {
    try {
        const app = createApp();
        const server = app.listen(config.port, () => {
            logger.info(`🚀 Zyra Assistant server listening on port ${config.port} in ${config.nodeEnv} mode`);
        });

        // Graceful shutdown
        const shutdown = (signal: string) => {
            logger.info(`${signal} received: closing HTTP server`);
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
            // Force close after 10s
            setTimeout(() => {
                logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
