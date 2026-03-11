const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não definido no ambiente.');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const tables = await client.query(
      "select tablename from pg_tables where schemaname='public' order by tablename"
    );
    console.log('Tabelas public:', tables.rows.map((r) => r.tablename).join(', '));

    const counts = await client.query(`
      select 'companies' as table_name, count(*)::int as row_count from companies
      union all select 'users', count(*)::int from users
      union all select 'clients', count(*)::int from clients
      union all select 'vehicles', count(*)::int from vehicles
      union all select 'plans', count(*)::int from plans
      union all select 'sales', count(*)::int from sales
      union all select 'activities', count(*)::int from activities
      union all select 'goals', count(*)::int from goals
      union all select 'commissions', count(*)::int from commissions
      union all select 'achievement_definitions', count(*)::int from achievement_definitions
      union all select 'user_achievements', count(*)::int from user_achievements
      union all select 'leaderboard', count(*)::int from leaderboard
      order by table_name
    `);
    console.log('Contagens:', counts.rows);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});

