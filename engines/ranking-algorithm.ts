/**
 * Ranking Algorithm — performance_score e sort_desc(performance_score)
 * Métricas M: revenue, conversion_rate, goal_completion, activity_consistency
 */

export interface SellerMetrics {
  user_id: string;
  revenue: number;
  sales_count: number;
  prospects_created: number;
  conversion_rate: number;
  goal_completion: number;   // 0..1
  activity_consistency: number; // 0..1
}

const WEIGHTS = {
  revenue: 0.4,
  conversion_rate: 0.3,
  goal_completion: 0.2,
  activity_consistency: 0.1,
} as const;

/**
 * Normaliza receita para 0–1 em relação ao máximo do grupo.
 */
function normalizeRevenue(metrics: SellerMetrics[], current: SellerMetrics): number {
  const maxRevenue = Math.max(1, ...metrics.map((m) => m.revenue));
  return maxRevenue === 0 ? 0 : current.revenue / maxRevenue;
}

/**
 * Calcula o performance score para um vendedor dado os métricas do grupo (para normalização).
 * performance_score =
 *   0.4 * revenue_generated +
 *   0.3 * conversion_rate +
 *   0.2 * goal_completion +
 *   0.1 * activity_consistency
 */
export function computePerformanceScore(
  current: SellerMetrics,
  allMetrics: SellerMetrics[]
): number {
  const normRevenue = normalizeRevenue(allMetrics, current);
  const conversion = Math.min(1, current.conversion_rate); // cap em 1
  const score =
    WEIGHTS.revenue * normRevenue +
    WEIGHTS.conversion_rate * conversion +
    WEIGHTS.goal_completion * current.goal_completion +
    WEIGHTS.activity_consistency * current.activity_consistency;
  return Math.round(score * 10000) / 10000;
}

export interface RankEntry {
  user_id: string;
  performance_score: number;
  rank_position: number;
  metrics: SellerMetrics;
}

/**
 * Gera o ranking ordenado por performance_score DESC; desempate por revenue DESC.
 */
export function generateRanking(metricsList: SellerMetrics[]): RankEntry[] {
  const withScores = metricsList.map((m) => ({
    metrics: m,
    performance_score: computePerformanceScore(m, metricsList),
  }));

  withScores.sort((a, b) => {
    if (b.performance_score !== a.performance_score) {
      return b.performance_score - a.performance_score;
    }
    return b.metrics.revenue - a.metrics.revenue;
  });

  return withScores.map((item, index) => ({
    user_id: item.metrics.user_id,
    performance_score: item.performance_score,
    rank_position: index + 1,
    metrics: item.metrics,
  }));
}

/**
 * Vetor do vendedor (V_seller) para analytics.
 */
export function sellerVector(m: SellerMetrics): number[] {
  return [
    m.sales_count,
    m.conversion_rate,
    m.revenue,
    m.goal_completion,
    m.activity_consistency,
  ];
}
