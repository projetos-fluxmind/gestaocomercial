const { Client } = require('pg');

const DEFAULT_ACHIEVEMENT_DEFINITIONS = [
  {
    code: 'first_sale',
    name: 'First Sale',
    description: 'Primeira venda realizada',
    condition_type: 'first_sale',
    condition_config: {},
  },
  {
    code: 'five_sales_streak',
    name: '5 Sales Streak',
    description: 'Cinco vendas no mês',
    condition_type: 'sales_count',
    condition_config: { min: 5 },
  },
  {
    code: 'ten_sales_month',
    name: '10 Sales Month',
    description: 'Dez vendas em um mês',
    condition_type: 'sales_count',
    condition_config: { min: 10 },
  },
  {
    code: 'goal_achieved',
    name: 'Goal Achieved',
    description: 'Meta do período alcançada',
    condition_type: 'goal_achieved',
    condition_config: {},
  },
  {
    code: 'top_seller_month',
    name: 'Top Seller of Month',
    description: 'Primeiro lugar no ranking do mês',
    condition_type: 'rank_position',
    condition_config: { position: 1 },
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não definido no ambiente.');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('BEGIN');

    for (const a of DEFAULT_ACHIEVEMENT_DEFINITIONS) {
      await client.query(
        `
        INSERT INTO achievement_definitions (code, name, description, condition_type, condition_config)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          condition_type = EXCLUDED.condition_type,
          condition_config = EXCLUDED.condition_config
        `,
        [a.code, a.name, a.description, a.condition_type, JSON.stringify(a.condition_config)]
      );
    }

    await client.query('COMMIT');

    const res = await client.query(
      'select code, name, condition_type from achievement_definitions order by code'
    );
    console.log(
      `Achievements seed OK (${res.rowCount}):`,
      res.rows.map((r) => r.code).join(', ')
    );
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

