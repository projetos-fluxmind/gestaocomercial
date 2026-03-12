import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

export const clientsRouter = Router();

const MASK = '***';

async function getClientIdsWithClosedSaleBySalesperson(companyId: string, salespersonId: string): Promise<Set<string>> {
  const res = await pool.query(
    `select distinct c.id from clients c
     join vehicles v on v.client_id = c.id and v.company_id = c.company_id
     join sales s on s.vehicle_id = v.id and s.company_id = c.company_id
     where c.company_id = $1 and s.salesperson_id = $2 and s.status = 'closed'`,
    [companyId, salespersonId]
  );
  return new Set(res.rows.map((r) => r.id));
}

function maskClientRow(row: any): any {
  return {
    ...row,
    email: row.email != null ? MASK : null,
    phone: row.phone != null ? MASK : null,
    document: row.document != null ? MASK : null,
  };
}

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

    let rows = result.rows;
    if (req.auth!.role === 'salesperson') {
      const maskSet = await getClientIdsWithClosedSaleBySalesperson(companyId, req.auth!.user_id);
      rows = rows.map((r) => (maskSet.has(r.id) ? maskClientRow(r) : r));
    }

    return res.json({ data: rows, page: Number(req.query.page ?? 1), limit });
  } catch (e) {
    next(e);
  }
});

clientsRouter.get('/companies/:companyId/clients/:id', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    const clientId = String(req.params.id ?? '');
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      'select id, name, email, phone, document, status, created_by, created_at from clients where id = $1 and company_id = $2',
      [clientId, companyId]
    );
    if (!result.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });

    let row = result.rows[0];
    if (req.auth!.role === 'salesperson') {
      const maskSet = await getClientIdsWithClosedSaleBySalesperson(companyId, req.auth!.user_id);
      if (maskSet.has(clientId)) row = maskClientRow(row);
    }
    return res.json(row);
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

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  status: z.enum(['prospect', 'client']).optional(),
});

clientsRouter.patch('/companies/:companyId/clients/:id', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    const clientId = String(req.params.id ?? '');
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = updateClientSchema.parse(req.body);
    const updates: string[] = [];
    const values: any[] = [companyId, clientId];
    let idx = 3;
    if (body.name !== undefined) { updates.push(`name = $${idx++}`); values.push(body.name); }
    if (body.email !== undefined) { updates.push(`email = $${idx++}`); values.push(body.email); }
    if (body.phone !== undefined) { updates.push(`phone = $${idx++}`); values.push(body.phone); }
    if (body.document !== undefined) { updates.push(`document = $${idx++}`); values.push(body.document); }
    if (body.status !== undefined) { updates.push(`status = $${idx++}`); values.push(body.status); }
    if (updates.length === 0) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Nenhum campo para atualizar' });

    updates.push('updated_at = now()');
    const result = await pool.query(
      `update clients set ${updates.join(', ')} where company_id = $1 and id = $2
       returning id, name, email, phone, document, status, created_by, created_at, updated_at`,
      values
    );
    if (!result.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Cliente não encontrado' });

    let row = result.rows[0];
    if (req.auth!.role === 'salesperson') {
      const maskSet = await getClientIdsWithClosedSaleBySalesperson(companyId, req.auth!.user_id);
      if (maskSet.has(clientId)) row = maskClientRow(row);
    }
    return res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});

