import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db/pool';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { generateRanking, type SellerMetrics } from '../../engines/ranking-algorithm';
import { getUnlockedCodes, runUnlockCheck } from '../gamification/achievements.service';

export const leaderboardRouter = Router();

function monthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

leaderboardRouter.get('/companies/:companyId/leaderboard', requireAuth, async (req, res, next) => {
  try {
    const companyId = req.params.companyId;
    if (companyId !== req.auth!.company_id)
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

    const period_type = (req.query.period_type?.toString() ?? 'month') as 'month';
    const period_key = req.query.period_key?.toString() ?? monthKey();

    const result = await pool.query(
      `select user_id, performance_score, rank_position, metrics, computed_at
       from leaderboard
       where company_id = $1 and period_type = $2 and period_key = $3
       order by rank_position asc`,
      [companyId, period_type, period_key]
    );

    return res.json({ period_type, period_key, data: result.rows });
  } catch (e) {
    next(e);
  }
});

leaderboardRouter.post(
  '/companies/:companyId/leaderboard/compute',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const companyId = req.params.companyId;
      if (companyId !== req.auth!.company_id)
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Tenant inválido' });

      const body = z
        .object({
          period_type: z.enum(['month']).default('month'),
          period_key: z.string().optional(),
        })
        .parse(req.body ?? {});

      const period_type = body.period_type;
      const period_key = body.period_key ?? monthKey();
      const m = /^(\d{4})-(\d{2})$/.exec(period_key);
      if (!m) {
        return res.status(422).json({
          code: 'VALIDATION_ERROR',
          message: 'period_key inválido (use YYYY-MM)',
        });
      }
      const year = Number(m[1]);
      const month = Number(m[2]);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));

      const sellersRes = await pool.query(
        `select id as user_id from users where company_id = $1 and role = 'salesperson' and is_active = true`,
        [companyId]
      );
      const sellerIds: string[] = sellersRes.rows.map((r) => r.user_id);

      const metrics: SellerMetrics[] = [];
      for (const user_id of sellerIds) {
        const revenueRes = await pool.query(
          `
          select coalesce(sum(value), 0)::numeric as revenue, count(*)::int as sales_count
          from sales
          where company_id = $1 and salesperson_id = $2 and status = 'closed' and closed_at >= $3 and closed_at < $4
          `,
          [companyId, user_id, start, end]
        );
        const prospectsRes = await pool.query(
          `
          select count(*)::int as prospects_created
          from clients
          where company_id = $1 and created_by = $2 and created_at >= $3 and created_at < $4
          `,
          [companyId, user_id, start, end]
        );
        const goalsRes = await pool.query(
          `
          select
            count(*)::int as total,
            sum(case when status='achieved' then 1 else 0 end)::int as achieved
          from goals
          where company_id = $1 and salesperson_id = $2 and period_start <= $4::date and period_end >= $3::date
          `,
          [companyId, user_id, start, end]
        );

        const revenue = Number(revenueRes.rows[0].revenue ?? 0);
        const sales_count = Number(revenueRes.rows[0].sales_count ?? 0);
        const prospects_created = Number(prospectsRes.rows[0].prospects_created ?? 0);
        const conversion_rate = prospects_created === 0 ? 0 : sales_count / prospects_created;

        const totalGoals = Number(goalsRes.rows[0].total ?? 0);
        const achievedGoals = Number(goalsRes.rows[0].achieved ?? 0);
        const goal_completion = totalGoals === 0 ? 0 : achievedGoals / totalGoals;

        // MVP: sem activities ainda -> 0
        const activity_consistency = 0;

        metrics.push({
          user_id,
          revenue,
          sales_count,
          prospects_created,
          conversion_rate,
          goal_completion,
          activity_consistency,
        });
      }

      const ranking = generateRanking(metrics);

      await pool.query('begin');
      try {
        // remove snapshot antigo
        await pool.query(
          `delete from leaderboard where company_id = $1 and period_type = $2 and period_key = $3`,
          [companyId, period_type, period_key]
        );

        for (const entry of ranking) {
          await pool.query(
            `
            insert into leaderboard (company_id, user_id, period_type, period_key, performance_score, rank_position, metrics)
            values ($1, $2, $3, $4, $5, $6, $7::jsonb)
            `,
            [
              companyId,
              entry.user_id,
              period_type,
              period_key,
              entry.performance_score,
              entry.rank_position,
              JSON.stringify(entry.metrics),
            ]
          );
        }
        await pool.query('commit');
      } catch (e) {
        await pool.query('rollback');
        throw e;
      }

      if (ranking.length > 0) {
        const first = ranking[0]!;
        const alreadyUnlocked = await getUnlockedCodes(companyId, first.user_id);
        await runUnlockCheck({
          company_id: companyId,
          user_id: first.user_id,
          already_unlocked: alreadyUnlocked,
          sales_this_month: first.metrics.sales_count,
          is_first_sale_ever: false,
          rank_position_this_month: 1,
        });
      }

      return res.json({ period_type, period_key, data: ranking });
    } catch (e) {
      if (e instanceof z.ZodError)
        return res
          .status(422)
          .json({ code: 'VALIDATION_ERROR', message: 'Payload inválido', details: e.flatten() });
      next(e);
    }
  }
);

