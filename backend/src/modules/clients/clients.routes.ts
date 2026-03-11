import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

export const clientsRouter = Router();

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  document: z.string().optional(),
  status: z.enum(['prospect', 'client']).default('prospect'),
  metadata: z.record(z.string(), z.any()).optional(),
});

clientsRouter.get('/companies/:companyId/clients', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const status = req.query.status?.toString();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = Math.max(0, (Number(req.query.page ?? 1) - 1) * limit);

    const params: any[] = [companyId];
    let where = 'company_id = $1';
    if (status && (status === 'prospect' || status === 'client')) {
      params.push(status);
      where += ` and status = $${params.length}`;
    }

    const result = await pool.query(
      `select id, name, email, phone, document, status, created_by, created_at
       from clients
       where ${where}
       order by created_at desc
       limit ${limit} offset ${offset}`,
      params
    );

    return res.json({ data: result.rows, page: Number(req.query.page ?? 1), limit });
  } catch (e) {
    next(e);
  }
});

clientsRouter.post('/companies/:companyId/clients', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = createClientSchema.parse(req.body);
    const result = await pool.query(
      `insert into clients (company_id, created_by, name, email, phone, document, status, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, name, email, phone, document, status, created_by, created_at`,
      [
        companyId,
        req.auth!.user_id,
        body.name,
        body.email ?? null,
        body.phone ?? null,
        body.document ?? null,
        body.status,
        body.metadata ? JSON.stringify(body.metadata) : JSON.stringify({}),
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});

