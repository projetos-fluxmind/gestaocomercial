import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const commissionsRouter = Router();

commissionsRouter.get('/companies/:companyId/commissions', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const isAdmin = req.auth!.role === 'admin';

    const params: any[] = [companyId];
    let where = 'c.company_id = $1';
    if (!isAdmin) {
      params.push(req.auth!.user_id);
      where += ` and c.salesperson_id = $${params.length}`;
    }

    const result = await pool.query(
      `select c.id, c.sale_id, c.salesperson_id, c.amount, c.status, c.created_at, c.paid_at
       from commissions c
       where ${where}
       order by c.created_at desc
       limit 50`,
      params
    );
    return res.json({ data: result.rows });
  } catch (e) {
    next(e);
  }
});

commissionsRouter.patch(
  '/companies/:companyId/commissions/:id',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      const commissionId = req.params.id;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const body = z.object({ status: z.enum(['pending', 'paid', 'cancelled']) }).parse(req.body);
      const paidAt = body.status === 'paid' ? new Date() : null;
      const result = await pool.query(
        `update commissions set status = $1, paid_at = $2, updated_at = now()
         where company_id = $3 and id = $4
         returning id, sale_id, salesperson_id, amount, status, paid_at, updated_at`,
        [body.status, paidAt, companyId, commissionId]
      );
      if (!result.rowCount) return res.status(404).json({ code: 'NOT_FOUND', message: 'Comissão não encontrada' });
      return res.json(result.rows[0]);
    } catch (e) {
      if (e instanceof z.ZodError)
        return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
      next(e);
    }
  }
);

