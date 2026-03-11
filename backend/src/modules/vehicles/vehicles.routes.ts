import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

export const vehiclesRouter = Router();

const createVehicleSchema = z.object({
  client_id: z.string().uuid(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  plate: z.string().optional(),
  vin: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

vehiclesRouter.get('/companies/:companyId/vehicles', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const client_id = req.query.client_id?.toString();
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = Math.max(0, (Number(req.query.page ?? 1) - 1) * limit);

    const params: any[] = [companyId];
    let where = 'v.company_id = $1';
    if (client_id) {
      params.push(client_id);
      where += ` and v.client_id = $${params.length}`;
    }

    const result = await pool.query(
      `select v.id, v.client_id, v.brand, v.model, v.year, v.plate, v.vin, v.created_at
       from vehicles v
       where ${where}
       order by v.created_at desc
       limit ${limit} offset ${offset}`,
      params
    );
    return res.json({ data: result.rows, page: Number(req.query.page ?? 1), limit });
  } catch (e) {
    next(e);
  }
});

vehiclesRouter.post('/companies/:companyId/vehicles', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id) return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = createVehicleSchema.parse(req.body);

    // valida se client pertence ao tenant
    const clientRes = await pool.query('select id from clients where id = $1 and company_id = $2', [
      body.client_id,
      companyId,
    ]);
    if (!clientRes.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Client não encontrado' });

    const result = await pool.query(
      `insert into vehicles (company_id, client_id, brand, model, year, plate, vin, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id, client_id, brand, model, year, plate, vin, created_at`,
      [
        companyId,
        body.client_id,
        body.brand ?? null,
        body.model ?? null,
        body.year ?? null,
        body.plate ?? null,
        body.vin ?? null,
        body.metadata ? JSON.stringify(body.metadata) : JSON.stringify({}),
      ]
    );
    return res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  }
});

