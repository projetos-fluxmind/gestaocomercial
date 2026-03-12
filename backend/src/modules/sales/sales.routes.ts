import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { calculateCommission } from '../../engines/commission-engine';
import { getUnlockedCodes, runUnlockCheck } from '../gamification/achievements.service';
import { updateGoalProgressOnSale } from '../goals/goals.service';

export const salesRouter = Router();

const createSaleSchema = z.object({
  vehicle_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  value: z.number().positive(),
  status: z.enum(['pending', 'closed', 'cancelled']).default('closed'),
  closed_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

salesRouter.get('/companies/:companyId/sales', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const isAdmin = req.auth!.role === 'admin';
    const salespersonId = req.query.salesperson_id?.toString();

    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = Math.max(0, (Number(req.query.page ?? 1) - 1) * limit);

    const params: any[] = [companyId];
    let where = 's.company_id = $1';

    if (!isAdmin) {
      params.push(req.auth!.user_id);
      where += ` and s.salesperson_id = $${params.length}`;
    } else if (salespersonId) {
      params.push(salespersonId);
      where += ` and s.salesperson_id = $${params.length}`;
    }

    const result = await pool.query(
      `select s.id, s.salesperson_id, s.vehicle_id, s.plan_id, s.value, s.status, s.closed_at, s.created_at
       from sales s
       where ${where}
       order by s.created_at desc
       limit ${limit} offset ${offset}`,
      params
    );
    return res.json({ data: result.rows, page: Number(req.query.page ?? 1), limit });
  } catch (e) {
    next(e);
  }
});

salesRouter.post('/companies/:companyId/sales', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const body = createSaleSchema.parse(req.body);

    await client.query('BEGIN');

    // valida plan pertence ao tenant
    const planRes = await client.query(
      'select id, company_id, commission_rules from plans where id = $1 and company_id = $2 and is_active = true',
      [body.plan_id, companyId]
    );
    if (!planRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Plano não encontrado' });
    }

    // valida vehicle pertence ao tenant
    const vehRes = await client.query('select id from vehicles where id = $1 and company_id = $2', [
      body.vehicle_id,
      companyId,
    ]);
    if (!vehRes.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Veículo não encontrado' });
    }

    const closedAt = body.closed_at ? new Date(body.closed_at) : body.status === 'closed' ? new Date() : null;

    const saleInsert = await client.query(
      `insert into sales (company_id, salesperson_id, vehicle_id, plan_id, value, status, closed_at, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       returning id, company_id, salesperson_id, plan_id, value, status, created_at, closed_at`,
      [
        companyId,
        req.auth!.user_id,
        body.vehicle_id,
        body.plan_id,
        body.value,
        body.status,
        closedAt,
        JSON.stringify(body.metadata ?? {}),
      ]
    );

    const sale = saleInsert.rows[0]!;

    let commission: any = null;
    if (sale.status === 'closed') {
      const plan = planRes.rows[0];
      const computed = calculateCommission(
        {
          id: sale.id,
          company_id: sale.company_id,
          salesperson_id: sale.salesperson_id,
          plan_id: sale.plan_id,
          value: Number(sale.value),
          status: sale.status,
        },
        {
          id: plan.id,
          company_id: plan.company_id,
          commission_rules: plan.commission_rules ?? [],
        }
      );

      const commissionRes = await client.query(
        `insert into commissions (company_id, sale_id, salesperson_id, amount, rules_applied, status)
         values ($1, $2, $3, $4, $5::jsonb, 'pending')
         on conflict (sale_id) do update set
            amount = excluded.amount,
            rules_applied = excluded.rules_applied,
            updated_at = now()
         returning id, amount, status, created_at`,
        [companyId, sale.id, sale.salesperson_id, computed.amount, JSON.stringify(computed.rules_applied)]
      );
      commission = commissionRes.rows[0];

      const closedAtDate = sale.closed_at ? new Date(sale.closed_at) : new Date();
      const monthStart = new Date(closedAtDate);
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

      const salesThisMonthRes = await client.query(
        `select count(*)::int as c from sales where company_id = $1 and salesperson_id = $2 and status = 'closed' and closed_at >= $3 and closed_at < $4`,
        [companyId, sale.salesperson_id, monthStart, monthEnd]
      );
      const firstSaleRes = await client.query(
        `select count(*)::int as c from sales where company_id = $1 and salesperson_id = $2 and status = 'closed'`,
        [companyId, sale.salesperson_id]
      );

      const alreadyUnlocked = await getUnlockedCodes(companyId, sale.salesperson_id);
      
      // Nota: runUnlockCheck e updateGoalProgressOnSale devem idealmente aceitar um client para transação
      await runUnlockCheck({
        company_id: companyId,
        user_id: sale.salesperson_id,
        already_unlocked: alreadyUnlocked,
        sales_this_month: Number(salesThisMonthRes.rows[0].c ?? 0),
        is_first_sale_ever: Number(firstSaleRes.rows[0].c ?? 0) <= 1,
      });

      await updateGoalProgressOnSale(
        companyId,
        sale.salesperson_id,
        Number(sale.value),
        closedAtDate
      );
    }

    await client.query('COMMIT');
    return res.status(201).json({ sale, commission });
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    if (e instanceof z.ZodError)
      return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
    next(e);
  } finally {
    client.release();
  }
});

