import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config(); // fallback se já estiver na pasta backend

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return url;
}

async function ensureCompany(client: Client, slug: string, name: string): Promise<string> {
  const existing = await client.query('select id from companies where slug = $1', [slug]);
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query('insert into companies (name, slug) values ($1, $2) returning id', [name, slug]);
  return inserted.rows[0].id;
}

async function upsertUser(
  client: Client,
  companyId: string,
  email: string,
  fullName: string,
  role: 'admin' | 'salesperson',
  password: string
) {
  const passwordHash = await bcrypt.hash(password, 10);

  // Unique(company_id, email)
  await client.query(
    `insert into users (company_id, email, password_hash, full_name, role, is_active)
     values ($1, $2, $3, $4, $5, true)
     on conflict (company_id, email)
     do update set password_hash = excluded.password_hash, full_name = excluded.full_name, role = excluded.role, is_active = true`,
    [companyId, email, passwordHash, fullName, role]
  );
}

async function main() {
  const databaseUrl = getDatabaseUrl();

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const companySlug = 'demo';
    const companyId = await ensureCompany(client, companySlug, 'Demo Company');

    await upsertUser(client, companyId, 'admin@demo.com', 'Admin Demo', 'admin', 'admin123');
    await upsertUser(client, companyId, 'seller@demo.com', 'Vendedor Demo', 'salesperson', 'seller123');

    console.log('Seed completed. Use these credentials:');
    console.log('- company_slug: demo');
    console.log('- admin: admin@demo.com / admin123');
    console.log('- seller: seller@demo.com / seller123');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});