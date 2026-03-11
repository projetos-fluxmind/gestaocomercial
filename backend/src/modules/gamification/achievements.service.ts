import { pool } from '../../db/pool';
import { evaluateAchievements, type AchievementCode, type UnlockContext } from '../../engines/gamification-engine';

export async function getUnlockedCodes(company_id: string, user_id: string): Promise<AchievementCode[]> {
  const res = await pool.query(
    `select ad.code from user_achievements ua
     join achievement_definitions ad on ad.id = ua.achievement_id
     where ua.company_id = $1 and ua.user_id = $2`,
    [company_id, user_id]
  );
  return res.rows.map((r) => r.code as AchievementCode);
}

export async function unlockAchievement(company_id: string, user_id: string, code: AchievementCode): Promise<void> {
  const def = await pool.query('select id from achievement_definitions where code = $1', [code]);
  if (!def.rowCount) return;
  await pool.query(
    `insert into user_achievements (company_id, user_id, achievement_id)
     values ($1, $2, $3) on conflict (company_id, user_id, achievement_id) do nothing`,
    [company_id, user_id, def.rows[0].id]
  );
}

export async function runUnlockCheck(context: UnlockContext): Promise<AchievementCode[]> {
  const toUnlock = evaluateAchievements(context);
  for (const code of toUnlock) {
    await unlockAchievement(context.company_id, context.user_id, code);
  }
  return toUnlock;
}
