/**
 * @file Winston logger configuration.
 */
import winston from 'winston';
import { config } from './index.js';

const { combine, timestamp, printf, colorize } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

/**
 * The application's Winston logger instance.
 */
export const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'zyra-assistant' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

// If we're not in production then log to the `console` with the format:
if (config.nodeEnv !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            myFormat
        )
    }));
}
