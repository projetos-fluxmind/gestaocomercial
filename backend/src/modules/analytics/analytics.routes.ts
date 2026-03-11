import { Router } from 'express';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/companies/:companyId/analytics/overview',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

      const revenueRes = await pool.query(
        `
        select coalesce(sum(value), 0)::numeric as monthly_revenue, count(*)::int as sales_closed
        from sales
        where company_id = $1 and status = 'closed' and closed_at >= $2 and closed_at < $3
        `,
        [companyId, monthStart, monthEnd]
      );

      const prospectsRes = await pool.query(
        `
        select count(*)::int as prospects_created
        from clients
        where company_id = $1 and status = 'prospect' and created_at >= $2 and created_at < $3
        `,
        [companyId, monthStart, monthEnd]
      );

      const sales_closed = Number(revenueRes.rows[0].sales_closed ?? 0);
      const prospects_created = Number(prospectsRes.rows[0].prospects_created ?? 0);
      const conversion_rate = prospects_created === 0 ? 0 : sales_closed / prospects_created;

      return res.json({
        period: { monthStart, monthEnd },
        monthly_revenue: Number(revenueRes.rows[0].monthly_revenue ?? 0),
        sales_closed,
        prospects_created,
        conversion_rate,
      });
    } catch (e) {
      next(e);
    }
  }
);

