# Estrutura do Frontend — Next.js (Interfaces I)

## Estrutura de pastas (App Router)

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Redirect por role
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar + header, auth required
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx            # dashboard_admin
│   │   │   │   ├── sales/
│   │   │   │   │   └── page.tsx        # sales_overview
│   │   │   │   ├── sellers/
│   │   │   │   │   └── page.tsx        # seller_performance
│   │   │   │   ├── goals/
│   │   │   │   │   └── page.tsx        # goals_management
│   │   │   │   ├── commissions/
│   │   │   │   │   └── page.tsx        # commission_reports
│   │   │   │   ├── ranking/
│   │   │   │   │   └── page.tsx        # ranking_dashboard
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx        # analytics_dashboard
│   │   │   └── seller/
│   │   │       ├── page.tsx            # dashboard_seller
│   │   │       ├── activity/
│   │   │       │   └── page.tsx        # activity_tracker
│   │   │       ├── sales/
│   │   │       │   └── page.tsx        # sales_registration
│   │   │       ├── vehicles/
│   │   │       │   └── page.tsx        # vehicle_registration
│   │   │       ├── goals/
│   │   │       │   └── page.tsx        # goals_progress
│   │   │       ├── commissions/
│   │   │       │   └── page.tsx        # commission_summary
│   │   │       ├── ranking/
│   │   │       │   └── page.tsx        # ranking_view
│   │   │       └── achievements/
│   │   │           └── page.tsx        # achievements_view
│   │   └── api/                        # Route handlers se necessário
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── RoleGuard.tsx
│   │   ├── admin/
│   │   │   ├── SalesOverviewTable.tsx
│   │   │   ├── SellerPerformanceCards.tsx
│   │   │   ├── GoalsManagementTable.tsx
│   │   │   ├── CommissionReportsTable.tsx
│   │   │   ├── RankingDashboard.tsx
│   │   │   └── AnalyticsCharts.tsx
│   │   ├── seller/
│   │   │   ├── ActivityTracker.tsx
│   │   │   ├── SalesRegistrationForm.tsx
│   │   │   ├── VehicleRegistrationForm.tsx
│   │   │   ├── GoalsProgressCards.tsx
│   │   │   ├── CommissionSummary.tsx
│   │   │   ├── RankingView.tsx
│   │   │   └── AchievementsGrid.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── ClientMaskedField.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useCompany.ts
│   └── types/
│       └── ...
├── package.json
└── next.config.js
```

---

## Mapeamento Interfaces (I) → Rotas

### Admin Interface

| Interface | Rota Next.js | Descrição |
|-----------|--------------|-----------|
| dashboard_admin | `/admin` | Visão geral: receita, vendas do período, alertas |
| sales_overview | `/admin/sales` | Listagem e filtros de vendas da empresa |
| seller_performance | `/admin/sellers` | Performance por vendedor (métricas, gráficos) |
| goals_management | `/admin/goals` | CRUD metas, atribuição a vendedores |
| commission_reports | `/admin/commissions` | Relatório de comissões (pendente/pago) |
| ranking_dashboard | `/admin/ranking` | Ranking da empresa (período configurável) |
| analytics_dashboard | `/admin/analytics` | Gráficos: receita, conversão, tendências |

### Seller Interface

| Interface | Rota Next.js | Descrição |
|-----------|--------------|-----------|
| dashboard_seller | `/seller` | Resumo: metas, vendas do mês, ranking pessoal |
| activity_tracker | `/seller/activity` | Registrar e listar atividades |
| sales_registration | `/seller/sales` | Registrar nova venda (veículo, plano, valor) |
| vehicle_registration | `/seller/vehicles` | Cadastrar veículos (vinculado a cliente) |
| goals_progress | `/seller/goals` | Acompanhamento das minhas metas |
| commission_summary | `/seller/commissions` | Minhas comissões (pendente/pago) |
| ranking_view | `/seller/ranking` | Meu ranking e posição no leaderboard |
| achievements_view | `/seller/achievements` | Badges desbloqueados e disponíveis |

---

## Navegação e RBAC

- **Layout (dashboard):** sidebar com itens conforme `role` (admin vs salesperson).
- **RoleGuard:** redireciona `/admin/*` para login ou `/seller` se role !== admin; idem para `/seller/*`.
- **Redirect pós-login:** Admin → `/admin`, Salesperson → `/seller`.
