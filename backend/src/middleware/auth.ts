import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type Role = 'admin' | 'salesperson';

export interface AuthClaims {
  user_id: string;
  company_id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token ausente' });

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthClaims;
    if (!decoded?.company_id || !decoded?.user_id || !decoded?.role) {
      return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token inválido' });
    }
    req.auth = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token inválido/expirado' });
  }
}

