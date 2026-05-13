import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try repo-root .env first, then backend-local .env. Existing process.env wins.
dotenv.config({
  path: [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env'),
  ],
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  UPLOAD_DIR: z.string().default('./uploads'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Public URL of the frontend, used to build links in outgoing emails.
  PORTAL_URL: z.string().url().default('http://localhost:8081'),

  // SMTP — all optional. When SMTP_HOST is unset the mailer logs to stdout
  // instead of attempting delivery, so dev without docker still works.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Employee Portal <no-reply@employeeportal.local>'),
  SMTP_SECURE: z.coerce.boolean().default(false),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Environment validation failed');
}

export const env = parsed.data;
