/**
 * Engines — Commission, Gamification, Ranking
 * Export centralizado para uso no backend.
 */

export {
  calculateCommission,
  type CommissionRule,
  type Plan,
  type Sale,
  type CommissionResult,
  type RuleApplied,
} from './commission-engine';

export {
  evaluateAchievements,
  DEFAULT_ACHIEVEMENT_DEFINITIONS,
  type AchievementCode,
  type AchievementDefinition,
  type UnlockContext,
} from './gamification-engine';

export {
  computePerformanceScore,
  generateRanking,
  sellerVector,
  type SellerMetrics,
  type RankEntry,
} from './ranking-algorithm';
