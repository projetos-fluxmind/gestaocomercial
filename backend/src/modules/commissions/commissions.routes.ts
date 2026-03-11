import { Router } from 'express';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';

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

