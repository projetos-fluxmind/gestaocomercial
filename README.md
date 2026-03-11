# CRM Vendas — SaaS de Gestão Comercial e Sales Intelligence

Plataforma multi-tenant para gestão de equipes comerciais e inteligência de vendas, modelada como sistema formal **S = (U, E, R, F, M, A, I)**.

## Escalabilidade

- **10.000 empresas** (tenants)
- **100.000 usuários**
- Estratégias: índice em `company_id`, arquitetura multi-tenant, cache (Redis), jobs em background, serviços modulares.

## Documentação e entregáveis

| Documento | Conteúdo |
|-----------|----------|
| [docs/01-ARCHITECTURE-MAP.md](docs/01-ARCHITECTURE-MAP.md) | Mapa de arquitetura (camadas, fluxo multi-tenant, responsabilidades, segurança) |
| [docs/02-DATABASE-SCHEMA.md](docs/02-DATABASE-SCHEMA.md) | Schema PostgreSQL, tabelas com `company_id`, índices, RLS opcional |
| [docs/03-BACKEND-STRUCTURE-AND-API.md](docs/03-BACKEND-STRUCTURE-AND-API.md) | Estrutura de módulos do backend e **API REST** (endpoints por domínio) |
| [docs/04-FRONTEND-PAGE-STRUCTURE.md](docs/04-FRONTEND-PAGE-STRUCTURE.md) | Estrutura Next.js (App Router), interfaces Admin e Seller, rotas |
| [docs/05-COMMISSION-ENGINE.md](docs/05-COMMISSION-ENGINE.md) | Lógica do **Commission Engine** (regras, algoritmo, integração) |
| [docs/06-GAMIFICATION-AND-RANKING.md](docs/06-GAMIFICATION-AND-RANKING.md) | **Gamificação** (achievements, unlock), **métricas (M)** e **ranking** |
| [engines/commission-engine.ts](engines/commission-engine.ts) | Implementação TypeScript do Commission Engine |
| [engines/gamification-engine.ts](engines/gamification-engine.ts) | Implementação TypeScript do Gamification Engine (avaliação de achievements) |
| [engines/ranking-algorithm.ts](engines/ranking-algorithm.ts) | Implementação TypeScript do algoritmo de ranking (performance_score, V_seller) |

## Resumo do modelo

- **U:** Admin (gestão, planos, metas, comissões, analytics) e Salesperson (prospects, clientes, veículos, vendas, metas, ranking, comissões, achievements).
- **E:** Company, User, Client, Vehicle, Plan, Sale, Activity, Goal, Commission, Achievement, Leaderboard.
- **R:** Company → Users, Clients; Client → Vehicles; Sale → Vehicle, Plan, Salesperson; Goal → Salesperson; Commission → Sale; Leaderboard → Salesperson.
- **F:** authenticate_user, create_client, register_vehicle, create_sale, log_activity, calculate_commission, compute_conversion_rate, evaluate_goal_progress, generate_sales_ranking, unlock_achievement, generate_analytics.
- **M:** monthly_revenue, conversion_rate, performance_score, V_seller, ranking.
- **A:** Client (Next.js) → API REST → Auth, User, Sales, Client, Vehicle, Goal, Commission, Gamification, Analytics → PostgreSQL, Redis, Queue, Storage.
- **I:** Dashboards e telas Admin e Seller conforme [04-FRONTEND-PAGE-STRUCTURE.md](docs/04-FRONTEND-PAGE-STRUCTURE.md).

## Segurança

- RBAC (Admin vs Salesperson), JWT, hash de senha.
- Dados sensíveis de clientes mascarados para vendedor após venda concluída; Admin com acesso total.
- Isolamento por tenant em todas as queries (`company_id`).

## Como usar este repositório

1. **Banco:** executar o DDL em [docs/02-DATABASE-SCHEMA.md](docs/02-DATABASE-SCHEMA.md) em um PostgreSQL.
2. **Backend:** criar projeto Node/TypeScript seguindo [docs/03-BACKEND-STRUCTURE-AND-API.md](docs/03-BACKEND-STRUCTURE-AND-API.md) e integrar os engines em `engines/`.
3. **Frontend:** criar app Next.js conforme [docs/04-FRONTEND-PAGE-STRUCTURE.md](docs/04-FRONTEND-PAGE-STRUCTURE.md).
4. **Jobs:** usar fila para recalcular ranking, comissões em lote e agregar analytics.
