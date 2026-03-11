export type AchievementCode =
  | 'first_sale'
  | 'five_sales_streak'
  | 'ten_sales_month'
  | 'goal_achieved'
  | 'top_seller_month';

export interface UnlockContext {
  company_id: string;
  user_id: string;
  already_unlocked: AchievementCode[];
  sales_this_month: number;
  is_first_sale_ever: boolean;
  goal_just_achieved?: boolean;
  rank_position_this_month?: number;
}

export function evaluateAchievements(context: UnlockContext): AchievementCode[] {
  const toUnlock: AchievementCode[] = [];

  if (context.is_first_sale_ever && !context.already_unlocked.includes('first_sale')) {
    toUnlock.push('first_sale');
  }
  if (context.sales_this_month >= 5 && !context.already_unlocked.includes('five_sales_streak')) {
    toUnlock.push('five_sales_streak');
  }
  if (context.sales_this_month >= 10 && !context.already_unlocked.includes('ten_sales_month')) {
    toUnlock.push('ten_sales_month');
  }
  if (context.goal_just_achieved && !context.already_unlocked.includes('goal_achieved')) {
    toUnlock.push('goal_achieved');
  }
  if (context.rank_position_this_month === 1 && !context.already_unlocked.includes('top_seller_month')) {
    toUnlock.push('top_seller_month');
  }
  return toUnlock;
}
