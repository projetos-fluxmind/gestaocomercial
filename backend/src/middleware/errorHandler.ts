import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Erro interno';
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: isDev ? message : 'Erro interno',
    ...(isDev && err instanceof Error && { stack: err.stack }),
  });
}

