#!/usr/bin/env node
// Thin wrapper around node-pg-migrate's programmatic API, using the same
// PG* env vars as the rest of the app (backend/src/config/env.ts) instead
// of the single DATABASE_URL string the CLI expects by default — keeps one
// source of truth for connection config.
//
// Usage: node scripts/migrate.cjs [up|down] [--fake]
require('dotenv').config();
const { runner } = require('node-pg-migrate');

const direction = process.argv[2] === 'down' ? 'down' : 'up';
const fake = process.argv.includes('--fake');

runner({
  databaseUrl: {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
  },
  dir: 'migrations',
  direction,
  migrationsTable: 'pgmigrations',
  count: Infinity,
  fake,
})
  .then((applied) => {
    if (!applied.length) {
      console.log('No pending migrations.');
    } else {
      console.log(
        `${fake ? 'Marked as applied (fake)' : 'Applied'}: ${applied.map((m) => m.name).join(', ')}`
      );
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
