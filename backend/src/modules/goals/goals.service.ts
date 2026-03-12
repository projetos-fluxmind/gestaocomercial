import { pool } from '../../db/pool';
import { getUnlockedCodes, runUnlockCheck } from '../gamification/achievements.service';

/**
 * Atualiza o progresso das metas do vendedor após uma venda fechada.
 * - revenue: soma value ao current_value das metas ativas no período
 * - count: incrementa 1 ao current_value das metas ativas no período
 * Marca como 'achieved' quando current_value >= target_value e dispara unlock goal_achieved.
 */
export async function updateGoalProgressOnSale(
  companyId: string,
  salespersonId: string,
  saleValue: number,
  closedAt: Date
): Promise<void> {
  const closedDate = new Date(closedAt);
  const dateStr = closedDate.toISOString().slice(0, 10);

  const goalsRes = await pool.query(
    `select id, target_type, target_value, current_value, status
     from goals
     where company_id = $1 and salesperson_id = $2 and status = 'active'
       and period_start <= $3::date and period_end >= $3::date`,
    [companyId, salespersonId, dateStr]
  );

  for (const g of goalsRes.rows) {
    let newCurrent = Number(g.current_value ?? 0);
    if (g.target_type === 'revenue') {
      newCurrent += saleValue;
    } else if (g.target_type === 'count') {
      newCurrent += 1;
    }
    // conversion: não atualizamos por venda única aqui (seria taxa no período)

    const targetVal = g.target_value != null ? Number(g.target_value) : null;
    const achieved = targetVal != null && newCurrent >= targetVal;

    await pool.query(
      `update goals set current_value = $1, status = $2, updated_at = now()
       where id = $3`,
      [newCurrent, achieved ? 'achieved' : 'active', g.id]
    );

    if (achieved) {
      const alreadyUnlocked = await getUnlockedCodes(companyId, salespersonId);
      await runUnlockCheck({
        company_id: companyId,
        user_id: salespersonId,
        already_unlocked: alreadyUnlocked,
        sales_this_month: 0,
        is_first_sale_ever: false,
        goal_just_achieved: true,
      });
    }
  }
}
