import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { env } from '../../config/env';
import type { AuthClaims, Role } from '../../middleware/auth';
import bcrypt from 'bcryptjs';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  company_slug: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

async function getCompanyIdBySlug(company_slug: string): Promise<string | null> {
  const res = await pool.query('select id from companies where slug = $1', [company_slug]);
  return res.rowCount ? res.rows[0].id : null;
}

async function getUserByEmail(company_id: string, email: string) {
  const res = await pool.query(
    'select id, company_id, email, password_hash, full_name, role, is_active from users where company_id = $1 and email = $2',
    [company_id, email]
  );
  return res.rowCount ? res.rows[0] : null;
}

export function signAccessToken(claims: AuthClaims) {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as any });
}

export function signRefreshToken(claims: AuthClaims) {
  return jwt.sign(claims, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL as any });
}

export async function login(input: LoginInput) {
  const company_id = await getCompanyIdBySlug(input.company_slug);
  if (!company_id) return null;

  const user = await getUserByEmail(company_id, input.email);
  if (!user || !user.is_active) return null;

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) return null;

  const claims: AuthClaims = {
    user_id: user.id,
    company_id: user.company_id,
    role: user.role as Role,
  };

  return {
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    access_token: signAccessToken(claims),
    refresh_token: signRefreshToken(claims),
  };
}

export function refresh(refresh_token: string) {
  const decoded = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET) as AuthClaims;
  const claims: AuthClaims = {
    user_id: decoded.user_id,
    company_id: decoded.company_id,
    role: decoded.role,
  };
  return {
    access_token: signAccessToken(claims),
    refresh_token: signRefreshToken(claims),
  };
}

