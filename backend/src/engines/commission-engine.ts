export type CommissionRule =
  | { type: 'percentage'; description: string; value: number; min_sale_value?: number }
  | {
      type: 'tier';
      description: string;
      tiers: Array<{ min: number; max: number | null; percentage: number }>;
    }
  | { type: 'fixed_bonus'; description: string; value: number };

export interface PlanForCommission {
  id: string;
  company_id: string;
  base_value?: number;
  commission_rules: CommissionRule[];
}

export interface SaleForCommission {
  id: string;
  company_id: string;
  salesperson_id: string;
  plan_id: string;
  value: number;
  status: string;
}

export interface RuleApplied {
  rule_type: string;
  description: string;
  amount: number;
}

export interface CommissionResult {
  amount: number;
  rules_applied: RuleApplied[];
}

export function calculateCommission(
  sale: SaleForCommission,
  plan: PlanForCommission
): CommissionResult {
  const rules_applied: RuleApplied[] = [];
  let total_commission = 0;

  const rules = plan.commission_rules ?? [];
  for (const rule of rules) {
    let amount = 0;

    if (rule.type === 'percentage') {
      if (rule.min_sale_value != null && sale.value < rule.min_sale_value) continue;
      amount = (sale.value * rule.value) / 100;
    } else if (rule.type === 'tier') {
      const tier = rule.tiers.find(
        (t) => sale.value >= t.min && (t.max == null || sale.value < t.max)
      );
      if (tier) amount = (sale.value * tier.percentage) / 100;
    } else if (rule.type === 'fixed_bonus') {
      amount = rule.value;
    }

    if (amount > 0) {
      total_commission += amount;
      rules_applied.push({ rule_type: rule.type, description: rule.description, amount });
    }
  }

  return { amount: Math.round(total_commission * 100) / 100, rules_applied };
}

