export interface SellerMetrics {
  user_id: string;
  revenue: number;
  sales_count: number;
  prospects_created: number;
  conversion_rate: number;
  goal_completion: number; // 0..1
  activity_consistency: number; // 0..1
}

const WEIGHTS = {
  revenue: 0.4,
  conversion_rate: 0.3,
  goal_completion: 0.2,
  activity_consistency: 0.1,
} as const;

function normalizeRevenue(metrics: SellerMetrics[], current: SellerMetrics): number {
  const maxRevenue = Math.max(1, ...metrics.map((m) => m.revenue));
  return maxRevenue === 0 ? 0 : current.revenue / maxRevenue;
}

export function computePerformanceScore(
  current: SellerMetrics,
  allMetrics: SellerMetrics[]
): number {
  const normRevenue = normalizeRevenue(allMetrics, current);
  const conversion = Math.min(1, current.conversion_rate);
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

export function generateRanking(metricsList: SellerMetrics[]): RankEntry[] {
  const withScores = metricsList.map((m) => ({
    metrics: m,
    performance_score: computePerformanceScore(m, metricsList),
  }));

  withScores.sort((a, b) => {
    if (b.performance_score !== a.performance_score) return b.performance_score - a.performance_score;
    return b.metrics.revenue - a.metrics.revenue;
  });

  return withScores.map((item, index) => ({
    user_id: item.metrics.user_id,
    performance_score: item.performance_score,
    rank_position: index + 1,
    metrics: item.metrics,
  }));
}

