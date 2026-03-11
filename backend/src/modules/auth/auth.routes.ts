import { Router } from 'express';
import { z } from 'zod';
import { login, loginSchema, refresh } from './auth.service';

export const authRouter = Router();

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);
    if (!result) return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' });
    return res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const body = z.object({ refresh_token: z.string().min(1) }).parse(req.body);
    const tokens = refresh(body.refresh_token);
    return res.json(tokens);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Refresh token inválido/expirado' });
  }
});

