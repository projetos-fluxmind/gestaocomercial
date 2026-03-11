import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

export const activitiesRouter = Router();

const logActivitySchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid().optional(),
  action: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional(),
});

activitiesRouter.get('/companies/:companyId/activities', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const isAdmin = req.auth!.role === 'admin';
    const userId = req.query.user_id?.toString();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = Math.max(0, (Number(req.query.page ?? 1) - 1) * limit);

    const params: any[] = [companyId];
    let where = 'company_id = $1';
    if (!isAdmin) {
      params.push(req.auth!.user_id);
      where += ` and user_id = $${params.length}`;
    } else if (userId) {
      params.push(userId);
      where += ` and user_id = $${params.length}`;
    }
    params.push(limit, offset);

    const result = await pool.query(
      `select id, user_id, entity_type, entity_id, action, payload, created_at
       from activities where ${where} order by created_at desc limit $${params.length - 1} offset $${params.length}`,
      params
    );
    return res.json({ data: result.rows, page: Number(req.query.page ?? 1), limit });
  } catch (e) {
    next(e);
  }
});

activitiesRouter.post('/companies/:companyId/activities', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = logActivitySchema.parse(req.body);
    const result = await pool.query(
      `insert into activities (company_id, user_id, entity_type, entity_id, action, payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning id, user_id, entity_type, entity_id, action, payload, created_at`,
      [
        companyId,
        req.auth!.user_id,
        body.entity_type,
        body.entity_id ?? null,
        body.action,
        JSON.stringify(body.payload ?? {}),
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});
