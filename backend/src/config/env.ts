import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((v) => !/YOUR_PROJECT|YOUR_PASSWORD/i.test(v), {
      message:
        'DATABASE_URL ainda esta com placeholder. Configure um Postgres real (ex: Supabase) em backend/.env.',
    }),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);