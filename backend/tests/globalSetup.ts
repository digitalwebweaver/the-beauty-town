// Runs once before the whole suite (a separate context from the actual
// tests — see tests/setup.ts for the per-worker env override). Creates a
// dedicated `salon_db_test` database, wiped and rebuilt fresh from the
// real migrations every run, so tests never touch the dev/seed database
// and never depend on leftover state from a previous run.
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_DB = 'salon_db_test';

const connectionBase = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
};

export async function setup() {
  const admin = new Client({ ...connectionBase, database: 'postgres' });
  await admin.connect();
  try {
    // Terminate any lingering connections from a previous crashed run
    // before dropping — DROP DATABASE fails if anything is still attached.
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [TEST_DB]
    );
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }

  await runner({
    databaseUrl: { ...connectionBase, database: TEST_DB },
    dir: path.resolve(__dirname, '../migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    count: Infinity,
    logger: { info: () => {}, warn: console.warn, error: console.error, debug: () => {} },
  });
}

// No teardown drop on purpose — the database is dropped-and-rebuilt fresh
// at the START of the next run (above), and leaving it around after a run
// lets you connect to `salon_db_test` and inspect state after a failure.
