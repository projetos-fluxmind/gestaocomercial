# Gamificação e Ranking — Lógica (F, M)

## 1. Métricas de negócio (M)

### Receita mensal
```
monthly_revenue = Σ(monthly_value_of_sales)
```
Soma do valor de todas as vendas com `status = 'closed'` e `closed_at` no mês, por company.

### Taxa de conversão
```
conversion_rate = sales_closed / prospects_created
```
Por vendedor e período: número de vendas fechadas / número de prospects criados pelo vendedor no mesmo período.

### Performance score (por vendedor, por período)
```
performance_score =
  0.4 * revenue_generated +
  0.3 * conversion_rate +
  0.2 * goal_completion +
  0.1 * activity_consistency
```
- **revenue_generated:** normalizado (ex: 0–1) em relação ao máximo da empresa no período.
- **conversion_rate:** valor bruto ou normalizado (ex: cap em 1).
- **goal_completion:** fração de metas atingidas no período (0–1).
- **activity_consistency:** ex: dias com pelo menos 1 atividade / dias úteis (0–1).

### Vetor do vendedor (V_seller)
```
V_seller = [
  sales_count,
  conversion_rate,
  revenue,
  goal_progress,
  activity_score
]
```
Usado para analytics e possivelmente para recomendações ou clustering.

### Ranking
```
ranking = sort_desc(performance_score)
```
Por company, por período (week/month/year). Desempate: mais receita primeiro.

---

## 2. Achievements (definições)

| Código | Nome | Condição |
|--------|------|----------|
| first_sale | First Sale | Primeira venda fechada pelo usuário (company) |
| five_sales_streak | 5 Sales Streak | 5 vendas em sequência em um mesmo mês (sem dia sem venda no intervalo) ou 5 vendas no mês |
| ten_sales_month | 10 Sales Month | 10 ou mais vendas em um único mês |
| goal_achieved | Goal Achieved | Pelo menos uma meta do período marcada como achieved |
| top_seller_month | Top Seller of Month | Posição 1 no leaderboard do mês (company) |

---

## 3. Função unlock_achievement(user)

**Lógica:**

1. Para cada **achievement definition** ainda não desbloqueado pelo usuário na company:
2. Avaliar **condition_type** + **condition_config** (ou código fixo por `code`).
3. Se `condition == true`:
   - Inserir em `user_achievements` (company_id, user_id, achievement_id).
   - Opcional: notificação, evento para analytics.

**Quando disparar:**

- Após `create_sale` (closed): checar first_sale, five_sales_streak, ten_sales_month.
- Após atualização de meta (goal achieved): checar goal_achieved.
- Após computar leaderboard do mês: checar top_seller_month para o usuário na posição 1.

---

## 4. Algoritmo de ranking (generate_sales_ranking)

**Entrada:** company_id, period_type ('month', 'week', 'year'), period_key (ex: '2025-03').

**Passos:**

1. **Período:** derivar start/end a partir de period_key.
2. **Por cada salesperson** da company (role = 'salesperson', is_active = true):
   - revenue_generated = soma(sales.value) onde sale fechada no período.
   - prospects_created = count(clients) onde created_by = user e created_at no período e status era prospect na criação (ou count de clientes que viraram vendas pode ser outra definição; aqui: prospects criados no período).
   - sales_closed = count(sales) fechadas no período.
   - conversion_rate = sales_closed / max(1, prospects_created).
   - goal_completion = metas do período achieved / total metas do período (0–1).
   - activity_consistency = dias com atividade / dias úteis no período (0–1).
3. **Normalizar** revenue_generated para 0–1 (dividir pelo max revenue no grupo).
4. **Calcular** performance_score para cada um.
5. **Ordenar** por performance_score DESC, depois revenue DESC.
6. **Persistir** em `leaderboard` (company_id, user_id, period_type, period_key, performance_score, rank_position, metrics).
7. **Retornar** lista ordenada (para API).

---

## 5. Resumo das funções do sistema (F)

| Função | Onde implementar |
|--------|-------------------|
| authenticate_user() | Auth Service |
| create_client() | Client Service |
| register_vehicle() | Vehicle Service |
| create_sale() | Sales Service (+ Commission Engine) |
| log_activity() | Activity Service |
| calculate_commission() | Commission Engine |
| compute_conversion_rate() | Analytics / Leaderboard Service |
| evaluate_goal_progress() | Goal Service |
| generate_sales_ranking() | Leaderboard Service |
| unlock_achievement() | Gamification Engine |
| generate_analytics() | Analytics Service |
