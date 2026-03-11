import type { Request, Response, NextFunction } from 'express';
import type { Role } from './auth';

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Sem autenticação' });
    if (!roles.includes(role)) return res.status(403).json({ code: 'FORBIDDEN', message: 'Sem permissão' });
    next();
  };
}

