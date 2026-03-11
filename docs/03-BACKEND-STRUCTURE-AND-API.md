# Estrutura do Backend e Endpoints da API REST

## Estrutura de módulos (Node.js/TypeScript sugerido)

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── env.ts
│   ├── middleware/
│   │   ├── auth.ts          # JWT validation, tenant context
│   │   ├── rbac.ts          # Admin vs Salesperson
│   │   └── errorHandler.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.routes.ts
│   │   ├── users/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.routes.ts
│   │   ├── clients/
│   │   │   ├── client.controller.ts
│   │   │   ├── client.service.ts
│   │   │   └── client.routes.ts
│   │   ├── vehicles/
│   │   │   ├── vehicle.controller.ts
│   │   │   ├── vehicle.service.ts
│   │   │   └── vehicle.routes.ts
│   │   ├── sales/
│   │   │   ├── sales.controller.ts
│   │   │   ├── sales.service.ts
│   │   │   └── sales.routes.ts
│   │   ├── activities/
│   │   │   ├── activity.controller.ts
│   │   │   ├── activity.service.ts
│   │   │   └── activity.routes.ts
│   │   ├── goals/
│   │   │   ├── goal.controller.ts
│   │   │   ├── goal.service.ts
│   │   │   └── goal.routes.ts
│   │   ├── commissions/
│   │   │   ├── commission.controller.ts
│   │   │   ├── commission.service.ts
│   │   │   ├── commission.routes.ts
│   │   │   └── engine/
│   │   │       └── commission-engine.ts
│   │   ├── gamification/
│   │   │   ├── gamification.controller.ts
│   │   │   ├── gamification.service.ts
│   │   │   ├── gamification.routes.ts
│   │   │   └── achievement-engine.ts
│   │   ├── leaderboard/
│   │   │   ├── leaderboard.controller.ts
│   │   │   ├── leaderboard.service.ts
│   │   │   └── leaderboard.routes.ts
│   │   └── analytics/
│   │       ├── analytics.controller.ts
│   │       ├── analytics.service.ts
│   │       └── analytics.routes.ts
│   ├── shared/
│   │   ├── db.ts
│   │   ├── redis.ts
│   │   ├── queue.ts
│   │   └── types/
│   │       ├── express.d.ts
│   │       └── api.ts
│   ├── jobs/
│   │   ├── ranking.job.ts
│   │   ├── commissions-batch.job.ts
│   │   └── analytics-aggregate.job.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

---

## API Endpoints — Resumo por domínio

### Auth (F: authenticate_user)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| POST | `/api/auth/login` | Login (email, password) → JWT | Public |
| POST | `/api/auth/refresh` | Refresh token | Authenticated |
| POST | `/api/auth/logout` | Invalida refresh token | Authenticated |

---

### Users (Admin: manage users)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/users` | Listar usuários | Admin |
| GET | `/api/users/me` | Perfil do usuário logado | All |
| POST | `/api/companies/:companyId/users` | Criar usuário | Admin |
| PATCH | `/api/companies/:companyId/users/:userId` | Atualizar usuário | Admin |
| DELETE | `/api/companies/:companyId/users/:userId` | Desativar usuário | Admin |

---

### Clients (F: create_client)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/clients` | Listar (prospects/clients, paginação) | All |
| GET | `/api/companies/:companyId/clients/:id` | Detalhe (máscara sensível para seller) | All |
| POST | `/api/companies/:companyId/clients` | Criar cliente/prospect | All |
| PATCH | `/api/companies/:companyId/clients/:id` | Atualizar | All |

---

### Vehicles (F: register_vehicle)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/vehicles` | Listar (filtro por client_id) | All |
| GET | `/api/companies/:companyId/vehicles/:id` | Detalhe | All |
| POST | `/api/companies/:companyId/vehicles` | Cadastrar veículo | All |
| PATCH | `/api/companies/:companyId/vehicles/:id` | Atualizar | All |

---

### Plans (Admin: create sales plans)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/plans` | Listar planos ativos | All |
| POST | `/api/companies/:companyId/plans` | Criar plano | Admin |
| PATCH | `/api/companies/:companyId/plans/:id` | Atualizar plano | Admin |
| DELETE | `/api/companies/:companyId/plans/:id` | Desativar plano | Admin |

---

### Sales (F: create_sale)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/sales` | Listar vendas (filtros: salesperson, date) | All* |
| GET | `/api/companies/:companyId/sales/:id` | Detalhe venda | All* |
| POST | `/api/companies/:companyId/sales` | Registrar venda | Salesperson/Admin |
| PATCH | `/api/companies/:companyId/sales/:id` | Atualizar (ex: status) | Admin |

*Seller vê apenas próprias vendas; Admin vê todas.

---

### Activities (F: log_activity)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/activities` | Listar atividades (user, entity) | All* |
| POST | `/api/companies/:companyId/activities` | Registrar atividade | All |

---

### Goals (Admin: create goals; F: evaluate_goal_progress)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/goals` | Listar metas (salesperson, period) | All* |
| GET | `/api/companies/:companyId/goals/:id` | Detalhe + progresso | All* |
| POST | `/api/companies/:companyId/goals` | Criar meta | Admin |
| PATCH | `/api/companies/:companyId/goals/:id` | Atualizar meta | Admin |
| GET | `/api/companies/:companyId/goals/progress` | Progresso das minhas metas | Salesperson |

*Seller vê apenas próprias metas.

---

### Commissions (F: calculate_commission)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/commissions` | Listar comissões (salesperson, period) | All* |
| GET | `/api/companies/:companyId/commissions/summary` | Resumo (total, pendente, pago) | All* |
| POST | `/api/companies/:companyId/commissions/recalculate` | Recalcular para uma venda | Admin |
| PATCH | `/api/companies/:companyId/commissions/:id` | Marcar como pago | Admin |

*Seller vê apenas próprias comissões.

---

### Gamification (F: unlock_achievement)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/achievements` | Listar definições de achievements | All |
| GET | `/api/companies/:companyId/achievements/me` | Meus achievements desbloqueados | Salesperson |
| POST | `/api/companies/:companyId/achievements/check` | Disparar checagem (interno ou job) | System/Admin |

---

### Leaderboard / Ranking (F: generate_sales_ranking)

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/leaderboard` | Ranking (period: week, month, year) | All |
| GET | `/api/companies/:companyId/leaderboard/me` | Minha posição e score | Salesperson |
| POST | `/api/companies/:companyId/leaderboard/compute` | Recalcular ranking (job) | Admin/System |

---

### Analytics (F: generate_analytics) — Admin

| Method | Endpoint | Descrição | Role |
|--------|----------|-----------|------|
| GET | `/api/companies/:companyId/analytics/overview` | Dashboard (revenue, conversion, top sellers) | Admin |
| GET | `/api/companies/:companyId/analytics/revenue` | Receita mensal/semanal | Admin |
| GET | `/api/companies/:companyId/analytics/conversion` | Taxa de conversão (prospects → sales) | Admin |
| GET | `/api/companies/:companyId/analytics/seller-performance` | Performance por vendedor | Admin |

---

## Convenções da API

- **Base URL:** `/api`
- **Tenant:** `companyId` em path ou inferido do JWT (`company_id`).
- **Paginação:** `?page=1&limit=20`
- **Filtros:** query params (ex: `?status=closed&from=2025-01-01`).
- **Respostas:** JSON; erro padrão `{ code, message, details? }`.
- **Códigos HTTP:** 200, 201, 400, 401, 403, 404, 422, 500.
