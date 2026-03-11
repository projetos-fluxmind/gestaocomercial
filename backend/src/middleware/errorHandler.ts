import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // não vazar detalhes internos por padrão
  console.error(err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro interno' });
}

