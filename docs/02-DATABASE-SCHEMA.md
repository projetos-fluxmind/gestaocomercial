# Schema do Banco de Dados — PostgreSQL Multi-tenant

## Convenções

- Todas as tabelas de negócio possuem **company_id** (UUID) para isolamento por tenant.
- Uso de **UUID** para PKs em entidades principais.
- **created_at** e **updated_at** em tabelas auditáveis.
- Índices compostos priorizando `(company_id, ...)` para performance multi-tenant.

---

## DDL — Tabelas principais

```sql
-- ============================================
-- CORE: Companies (tenant root)
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_slug ON companies(slug);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'salesperson')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company_role ON users(company_id, role);
CREATE INDEX idx_users_company_active ON users(company_id, is_active);

-- ============================================
-- CLIENTS (prospects + clients)
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'client')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_company_status ON clients(company_id, status);
CREATE INDEX idx_clients_company_created ON clients(company_id, created_at DESC);

-- ============================================
-- VEHICLES
-- ============================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    plate VARCHAR(20),
    vin VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_company ON vehicles(company_id);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);

-- ============================================
-- PLANS (sales plans - admin config)
-- ============================================
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_value DECIMAL(15, 2),
    commission_rules JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plans_company_active ON plans(company_id, is_active);

-- ============================================
-- SALES
-- ============================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    salesperson_id UUID NOT NULL REFERENCES users(id),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    plan_id UUID NOT NULL REFERENCES plans(id),
    value DECIMAL(15, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'closed' CHECK (status IN ('pending', 'closed', 'cancelled')),
    closed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_company_date ON sales(company_id, created_at DESC);
CREATE INDEX idx_sales_salesperson ON sales(company_id, salesperson_id, closed_at);
CREATE INDEX idx_sales_vehicle ON sales(vehicle_id);

-- ============================================
-- ACTIVITIES (log de atividades)
-- ============================================
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_company_user ON activities(company_id, user_id, created_at DESC);
CREATE INDEX idx_activities_entity ON activities(company_id, entity_type, entity_id);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    salesperson_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    target_value DECIMAL(15, 2),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('revenue', 'count', 'conversion')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    current_value DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'missed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_company_salesperson ON goals(company_id, salesperson_id, period_end);
CREATE INDEX idx_goals_period ON goals(company_id, period_start, period_end);

-- ============================================
-- COMMISSIONS
-- ============================================
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id),
    salesperson_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    rules_applied JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sale_id)
);

CREATE INDEX idx_commissions_company_salesperson ON commissions(company_id, salesperson_id, created_at DESC);
CREATE INDEX idx_commissions_sale ON commissions(sale_id);

-- ============================================
-- ACHIEVEMENTS (definição dos badges)
-- ============================================
CREATE TABLE achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    condition_type VARCHAR(100) NOT NULL,
    condition_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER ACHIEVEMENTS (desbloqueios por usuário/tenant)
-- ============================================
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    achievement_id UUID NOT NULL REFERENCES achievement_definitions(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_company_user ON user_achievements(company_id, user_id);

-- ============================================
-- LEADERBOARD (snapshot ou materializado)
-- ============================================
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'year')),
    period_key VARCHAR(20) NOT NULL,
    performance_score DECIMAL(10, 4) NOT NULL,
    rank_position INTEGER NOT NULL,
    metrics JSONB DEFAULT '{}',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id, period_type, period_key)
);

CREATE INDEX idx_leaderboard_company_period ON leaderboard(company_id, period_type, period_key, rank_position);
```

---

## Relacionamentos (R) — Resumo

| Relação | Tipo | Tabelas |
|---------|------|---------|
| Company → Users | 1:N | companies.id → users.company_id |
| Company → Clients | 1:N | companies.id → clients.company_id |
| Client → Vehicles | 1:N | clients.id → vehicles.client_id |
| Sale → Vehicle | N:1 | sales.vehicle_id → vehicles.id |
| Sale → Plan | N:1 | sales.plan_id → plans.id |
| Sale → Salesperson | N:1 | sales.salesperson_id → users.id |
| Goal → Salesperson | N:1 | goals.salesperson_id → users.id |
| Commission → Sale | 1:1 | commissions.sale_id → sales.id |
| Leaderboard → Salesperson | N:1 | leaderboard.user_id → users.id |

---

## Row-Level Security (opcional, PostgreSQL)

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ... demais tabelas com company_id

CREATE POLICY tenant_isolation_users ON users
    USING (company_id = current_setting('app.current_company_id')::UUID);
-- Replicar política para outras tabelas tenant-scoped.
```

Uso: definir `app.current_company_id` por sessão após validar JWT.
