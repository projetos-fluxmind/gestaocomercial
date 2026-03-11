/**
 * Gamification Engine — Verificação e desbloqueio de achievements.
 * unlock_achievement(user) when condition == true
 */

export type AchievementCode =
  | 'first_sale'
  | 'five_sales_streak'
  | 'ten_sales_month'
  | 'goal_achieved'
  | 'top_seller_month';

export interface AchievementDefinition {
  id: string;
  code: AchievementCode;
  name: string;
  description: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
}

export interface UnlockContext {
  company_id: string;
  user_id: string;
  already_unlocked: AchievementCode[];
  /** Vendas fechadas no mês (para streak e count) */
  sales_this_month: number;
  /** Se é a primeira venda do usuário na company (histórico total) */
  is_first_sale_ever: boolean;
  /** Meta do período alcançada neste evento */
  goal_just_achieved?: boolean;
  /** Posição no ranking do mês (1 = top) */
  rank_position_this_month?: number;
}

/**
 * Retorna códigos de achievements que devem ser desbloqueados dado o contexto.
 * A persistência (user_achievements) fica a cargo do Gamification Service.
 */
export function evaluateAchievements(context: UnlockContext): AchievementCode[] {
  const toUnlock: AchievementCode[] = [];

  if (
    context.is_first_sale_ever &&
    !context.already_unlocked.includes('first_sale')
  ) {
    toUnlock.push('first_sale');
  }

  if (
    context.sales_this_month >= 5 &&
    !context.already_unlocked.includes('five_sales_streak')
  ) {
    toUnlock.push('five_sales_streak');
  }

  if (
    context.sales_this_month >= 10 &&
    !context.already_unlocked.includes('ten_sales_month')
  ) {
    toUnlock.push('ten_sales_month');
  }

  if (
    context.goal_just_achieved &&
    !context.already_unlocked.includes('goal_achieved')
  ) {
    toUnlock.push('goal_achieved');
  }

  if (
    context.rank_position_this_month === 1 &&
    !context.already_unlocked.includes('top_seller_month')
  ) {
    toUnlock.push('top_seller_month');
  }

  return toUnlock;
}

/** Definições padrão para seed no banco */
export const DEFAULT_ACHIEVEMENT_DEFINITIONS: Omit<AchievementDefinition, 'id'>[] = [
  { code: 'first_sale', name: 'First Sale', description: 'Primeira venda realizada', condition_type: 'first_sale', condition_config: {} },
  { code: 'five_sales_streak', name: '5 Sales Streak', description: 'Cinco vendas no mês', condition_type: 'sales_count', condition_config: { min: 5 } },
  { code: 'ten_sales_month', name: '10 Sales Month', description: 'Dez vendas em um mês', condition_type: 'sales_count', condition_config: { min: 10 } },
  { code: 'goal_achieved', name: 'Goal Achieved', description: 'Meta do período alcançada', condition_type: 'goal_achieved', condition_config: {} },
  { code: 'top_seller_month', name: 'Top Seller of Month', description: 'Primeiro lugar no ranking do mês', condition_type: 'rank_position', condition_config: { position: 1 } },
];
