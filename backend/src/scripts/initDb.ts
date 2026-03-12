import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import dns from 'node:dns';

dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config(); // Fallback para se já estiver na pasta backend

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  return url;
}

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  return {
    reset: args.has('--reset'),
  };
}

async function main() {
  const { reset } = parseArgs(process.argv.slice(2));
  const databaseUrl = getDatabaseUrl();

  // When run via `npm --prefix backend ...`, cwd is repo root. When run inside `backend/`, cwd is backend.
  const cwd = process.cwd();
  const schemaPathCandidates = [
    path.join(cwd, 'database', 'schema.sql'),
    path.join(cwd, '..', 'database', 'schema.sql'),
  ];

  let schemaPath: string | null = null;
  for (const candidate of schemaPathCandidates) {
    try {
      await fs.access(candidate);
      schemaPath = candidate;
      break;
    } catch {
      // continue
    }
  }
  if (!schemaPath) {
    throw new Error(`schema.sql not found. Tried: ${schemaPathCandidates.join(', ')}`);
  }

  const sql = await fs.readFile(schemaPath, 'utf8');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    if (reset) {
      // Destructive: wipe public schema.
      await client.query('drop schema if exists public cascade; create schema public;');
    }

    // Needed for gen_random_uuid() in schema.
    await client.query('create extension if not exists pgcrypto;');

    const statements = sql
      .split(/;\s*\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
    }

    console.log(`DB initialized from ${schemaPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});