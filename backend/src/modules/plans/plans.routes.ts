import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const plansRouter = Router();

const upsertPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base_value: z.number().optional(),
  commission_rules: z.array(z.any()).default([]),
  is_active: z.boolean().default(true),
});

plansRouter.get('/companies/:companyId/plans', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      `select id, name, description, base_value, commission_rules, is_active, created_at, updated_at
       from plans
       where company_id = $1
       order by created_at desc`,
      [companyId]
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

plansRouter.post(
  '/companies/:companyId/plans',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const body = upsertPlanSchema.parse(req.body);
      const result = await pool.query(
        `insert into plans (company_id, name, description, base_value, commission_rules, is_active)
         values ($1, $2, $3, $4, $5::jsonb, $6)
         returning id, name, description, base_value, commission_rules, is_active, created_at`,
        [
          companyId,
          body.name,
          body.description ?? null,
          body.base_value ?? null,
          JSON.stringify(body.commission_rules ?? []),
          body.is_active,
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res
          .status(422)
          .json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
      next(e);
    }
  }
);

