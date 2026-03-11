const { Client } = require('pg');
const bcrypt = require('bcryptjs');

function env(name, fallback) {
  const v = process.env[name];
  return v == null || v === '' ? fallback : v;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não definido no ambiente.');

  const COMPANY_NAME = env('COMPANY_NAME', 'CRM VENDAS (Demo)');
  const COMPANY_SLUG = env('COMPANY_SLUG', 'crm-vendas-demo');
  const ADMIN_EMAIL = env('ADMIN_EMAIL', 'admin@demo.local');
  const ADMIN_PASSWORD = env('ADMIN_PASSWORD', 'ChangeMeNow!123');
  const ADMIN_FULL_NAME = env('ADMIN_FULL_NAME', 'Admin Demo');

  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('BEGIN');

    const companyRes = await client.query(
      `
      INSERT INTO companies (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
      RETURNING id
      `,
      [COMPANY_NAME, COMPANY_SLUG]
    );

    const company_id = companyRes.rows[0].id;

    await client.query(
      `
      INSERT INTO users (company_id, email, password_hash, full_name, role, is_active)
      VALUES ($1, $2, $3, $4, 'admin', true)
      ON CONFLICT (company_id, email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = 'admin',
        is_active = true,
        updated_at = NOW()
      `,
      [company_id, ADMIN_EMAIL, password_hash, ADMIN_FULL_NAME]
    );

    await client.query('COMMIT');

    console.log('Seed tenant/admin OK:', { company_slug: COMPANY_SLUG, admin_email: ADMIN_EMAIL });
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});

