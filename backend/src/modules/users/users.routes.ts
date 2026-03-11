import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import bcrypt from 'bcryptjs';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { user_id, company_id } = req.auth!;
    const result = await pool.query(
      'select id, email, full_name, role, company_id, is_active, created_at from users where id = $1 and company_id = $2',
      [user_id, company_id]
    );
    if (!result.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    return res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

usersRouter.get('/companies/:companyId/users', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      'select id, email, full_name, role, is_active, created_at from users where company_id = $1 order by created_at desc',
      [companyId]
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

usersRouter.post('/companies/:companyId/users', requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        full_name: z.string().min(1),
        role: z.enum(['admin', 'salesperson']),
      })
      .parse(req.body);

    const password_hash = await bcrypt.hash(body.password, 10);
    const result = await pool.query(
      `insert into users (company_id, email, password_hash, full_name, role, is_active)
       values ($1, $2, $3, $4, $5, true)
       returning id, email, full_name, role, is_active, created_at`,
      [companyId, body.email, password_hash, body.full_name, body.role]
    );

    return res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});

