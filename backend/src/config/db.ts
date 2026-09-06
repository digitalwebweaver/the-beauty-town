import { Pool, PoolClient, QueryResult, QueryResultRow, types } from 'pg';
import { env } from './env';
import { logger } from './logger';

// Return PG DATE / TIME columns as plain strings rather than JS Date objects.
// Prevents timezone-shifted ISO strings like "2026-07-21T18:30:00.000Z" when
// the actual date in the DB is just "2026-07-22".
// Type OIDs: 1082 = DATE, 1083 = TIME, 1266 = TIMETZ
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1083, (v) => v);
types.setTypeParser(1266, (v) => v);

export const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Without this, one wedged/slow query inside a transaction (e.g. stuck
  // behind a lock held by another connection) can hold a pool connection
  // indefinitely — out of only 20 total — starving every other request.
  // 15s is generous for anything this app actually does; a query that
  // needs longer than that is itself a bug worth surfacing, not something
  // to let run forever.
  statement_timeout: 15_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected PG pool error', { err });
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params as never);
    const ms = Date.now() - start;
    if (ms > 250) {
      logger.warn('Slow query', { ms, text });
    }
    return res;
  } catch (err) {
    logger.error('Query failed', { text, err });
    throw err;
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function pingDb(): Promise<void> {
  const { rows } = await pool.query('SELECT NOW() AS now');
  logger.info('✅ DB connected', { at: rows[0].now });
}
