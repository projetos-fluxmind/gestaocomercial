import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { getUnlockedCodes, runUnlockCheck } from '../gamification/achievements.service';

export const goalsRouter = Router();

const createGoalSchema = z.object({
  salesperson_id: z.string().uuid(),
  title: z.string().min(1),
  target_value: z.number().optional(),
  target_type: z.enum(['revenue', 'count', 'conversion']),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

goalsRouter.get('/companies/:companyId/goals', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const isAdmin = req.auth!.role === 'admin';
    const salespersonId = req.query.salesperson_id?.toString();

    const params: any[] = [companyId];
    let where = 'company_id = $1';
    if (!isAdmin) {
      params.push(req.auth!.user_id);
      where += ` and salesperson_id = $${params.length}`;
    } else if (salespersonId) {
      params.push(salespersonId);
      where += ` and salesperson_id = $${params.length}`;
    }

    const result = await pool.query(
      `select id, salesperson_id, title, target_value, target_type, period_start, period_end, current_value, status, created_at
       from goals where ${where} order by period_end desc limit 100`,
      params
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

goalsRouter.get('/companies/:companyId/goals/progress', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const result = await pool.query(
      `select id, title, target_value, target_type, period_start, period_end, current_value, status
       from goals where company_id = $1 and salesperson_id = $2 and status = 'active'
       order by period_end asc`,
      [companyId, req.auth!.user_id]
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

goalsRouter.post(
  '/companies/:companyId/goals',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const body = createGoalSchema.parse(req.body);

      const userCheck = await pool.query(
        'select id from users where id = $1 and company_id = $2 and role = $3',
        [body.salesperson_id, companyId, 'salesperson']
      );
      if (!userCheck.rowCount)
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Vendedor não encontrado' });

      const result = await pool.query(
        `insert into goals (company_id, salesperson_id, title, target_value, target_type, period_start, period_end, current_value, status)
         values ($1, $2, $3, $4, $5, $6::date, $7::date, 0, 'active')
         returning id, salesperson_id, title, target_value, target_type, period_start, period_end, current_value, status, created_at`,
        [
          companyId,
          body.salesperson_id,
          body.title,
          body.target_value ?? null,
          body.target_type,
          body.period_start,
          body.period_end,
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
      next(e);
    }
  }
);

goalsRouter.patch(
  '/companies/:companyId/goals/:id',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      const goalId = req.params.id;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const body = z
        .object({
          title: z.string().min(1).optional(),
          target_value: z.number().optional(),
          current_value: z.number().optional(),
          status: z.enum(['active', 'achieved', 'missed']).optional(),
        })
        .partial()
        .parse(req.body);

      const updates: string[] = [];
      const values: any[] = [companyId, goalId];
      let idx = 3;
      if (body.title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(body.title);
      }
      if (body.target_value !== undefined) {
        updates.push(`target_value = $${idx++}`);
        values.push(body.target_value);
      }
      if (body.current_value !== undefined) {
        updates.push(`current_value = $${idx++}`);
        values.push(body.current_value);
      }
      if (body.status !== undefined) {
        updates.push(`status = $${idx++}`);
        values.push(body.status);
      }
      if (updates.length === 0) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Nenhum campo para atualizar' });

      updates.push('updated_at = now()');
      const result = await pool.query(
        `update goals set ${updates.join(', ')} where company_id = $1 and id = $2
         returning id, salesperson_id, title, target_value, target_type, period_start, period_end, current_value, status, updated_at`,
        values
      );
      if (!result.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Meta não encontrada' });
      const goal = result.rows[0];
      if (body.status === 'achieved' && goal.salesperson_id) {
        const alreadyUnlocked = await getUnlockedCodes(companyId, goal.salesperson_id);
        await runUnlockCheck({
          company_id: companyId,
          user_id: goal.salesperson_id,
          already_unlocked: alreadyUnlocked,
          sales_this_month: 0,
          is_first_sale_ever: false,
          goal_just_achieved: true,
        });
      }
      return res.json(goal);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
      next(e);
    }
  }
);
