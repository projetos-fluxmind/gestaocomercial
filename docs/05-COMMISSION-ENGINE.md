# Commission Engine — Lógica e Regras

## Objetivo

Calcular a comissão de uma venda com base no **plano** associado e em regras configuráveis por empresa (armazenadas em `plans.commission_rules`).

---

## Entradas

- **sale:** `{ id, value, plan_id, salesperson_id, company_id }`
- **plan:** `{ id, base_value, commission_rules }`
- **contexto opcional:** metas batidas, bônus por volume, etc.

---

## Estrutura de `commission_rules` (JSONB)

Cada plano pode ter uma lista de regras aplicadas em ordem. Exemplo:

```json
[
  {
    "type": "percentage",
    "description": "Comissão base",
    "value": 5,
    "min_sale_value": 0
  },
  {
    "type": "tier",
    "description": "Bônus acima de R$ 50k",
    "tiers": [
      { "min": 0, "max": 50000, "percentage": 5 },
      { "min": 50000, "max": 100000, "percentage": 7 },
      { "min": 100000, "max": null, "percentage": 10 }
    ]
  },
  {
    "type": "fixed_bonus",
    "description": "Bônus fixo por venda fechada",
    "value": 500
  }
]
```

---

## Algoritmo (calculate_commission)

1. **Carregar** plano e `commission_rules`.
2. **Inicializar** `total_commission = 0` e `rules_applied = []`.
3. **Para cada regra** em `commission_rules`:
   - **percentage:**  
     `amount = sale.value * (rule.value / 100)`  
     Se existir `min_sale_value` e `sale.value < min_sale_value`, pular.
   - **tier:**  
     Encontrar o tier onde `sale.value >= tier.min` e `(tier.max === null || sale.value < tier.max)`.  
     `amount = sale.value * (tier.percentage / 100)`.
   - **fixed_bonus:**  
     `amount = rule.value`.
4. **Acumular** `amount` em `total_commission` e registrar em `rules_applied`:  
   `{ rule_type, description, amount }`.
5. **Persistir** em `commissions`:  
   `sale_id`, `salesperson_id`, `company_id`, `amount = total_commission`, `rules_applied`, `status = 'pending'`.
6. **Retornar** `{ commission_id, amount, rules_applied }`.

---

## Regras de negócio

- Uma venda gera **no máximo uma** comissão (UNIQUE sale_id em `commissions`).
- Ao criar/atualizar venda com status `closed`, o engine é disparado (síncrono ou via job).
- Se a venda for cancelada, a comissão pode ser cancelada (`status = 'cancelled'`) ou recalculada para 0.
- **Recalcular:** endpoint Admin permite recalcular comissão para uma `sale_id` (útil se regras do plano mudaram).

---

## Integração

- **Sales Service:** após `create_sale()` ou `updateSaleStatus(id, 'closed')`, chama `CommissionEngine.calculate(saleId)`.
- **Commission Service:** expõe `recalculate(saleId)` que chama o engine e atualiza o registro em `commissions`.
