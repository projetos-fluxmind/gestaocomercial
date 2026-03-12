export type UserRole = 'admin' | 'salesperson';

export type ClientStatus = 'prospect' | 'client';

export type GoalTargetType = 'revenue' | 'count' | 'conversion' | (string & {});

export type GoalStatus = 'active' | 'completed' | 'canceled' | (string & {});

export type CommissionStatus = 'pending' | 'paid' | (string & {});

export type SaleStatus = 'open' | 'closed' | 'canceled' | (string & {});

export interface UserMe {
  id: string;
  company_id: string;
  role: UserRole;
}

export interface ApiListResponse<T> {
  data?: T[];
  // Allow extra fields (pagination, metadata) without using `any`.
  [key: string]: unknown;
}

export interface CompanyUser {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  email?: string | null;
  phone?: string | null;
}

export interface Vehicle {
  id: string;
  client_id?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  commission_rules?: unknown;
  is_active?: boolean;
}

export interface Sale {
  id: string;
  value: number;
  status: SaleStatus;
}

export interface Commission {
  id: string;
  amount: number;
  status: CommissionStatus;
  sale_id: string;
}

export interface LeaderboardEntry {
  user_id: string;
  rank_position: number;
  performance_score: number;
}

export interface Goal {
  id: string;
  title: string;
  status: GoalStatus;
  target_type: GoalTargetType;
  target_value?: number | null;
  current_value?: number | null;
  period_start: string;
  period_end: string;
}

export interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface UnlockedAchievement {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  unlocked_at: string;
}

export interface Activity {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  created_at: string;
}

export interface AnalyticsOverview {
  monthly_revenue?: number;
  sales_closed?: number;
  prospects_created?: number;
  conversion_rate?: number;
}