/**
 * @file Application configuration module.
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables early if needed by tests, but index.ts will load it too
dotenv.config();

const envSchema = z.object({
    PORT: z.string().default('3000').transform(Number),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    LLM_MODE: z.enum(['cloud', 'local', 'auto']).default('auto'),
    ANTHROPIC_API_KEY: z.string().optional(),
    OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('llama3'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
    JWT_SECRET: z.string().default('default_jwt_secret_change_me_in_prod'),
    ASSISTANT_NAME: z.string().default('Zyra'),
    OWNER_NAME: z.string().default('User')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    process.exit(1);
}

/**
 * Typed application configuration object.
 */
export const config = {
    port: _env.data.PORT,
    nodeEnv: _env.data.NODE_ENV,
    llmMode: _env.data.LLM_MODE,
    anthropicApiKey: _env.data.ANTHROPIC_API_KEY,
    ollamaBaseUrl: _env.data.OLLAMA_BASE_URL,
    ollamaModel: _env.data.OLLAMA_MODEL,
    logLevel: _env.data.LOG_LEVEL,
    jwtSecret: _env.data.JWT_SECRET,
    assistantName: _env.data.ASSISTANT_NAME,
    ownerName: _env.data.OWNER_NAME
} as const;

/**
 * Type of the application configuration object.
 */
export type AppConfig = typeof config;
