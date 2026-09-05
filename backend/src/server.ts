import 'dotenv/config';
import { createApp } from './app';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { pingDb, pool } from '@/config/db';

async function bootstrap() {
  const app = createApp();

  try {
    await pingDb();
  } catch (err) {
    logger.error(
      '❌ Cannot connect to Postgres. Did you run `npm run migrate:up` (and, for local dev, load salon_db_seed.sql for demo data)? Env: ' +
        JSON.stringify({
          host: env.PGHOST,
          port: env.PGPORT,
          db: env.PGDATABASE,
          user: env.PGUSER,
        }),
      { err }
    );
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API listening on http://localhost:${env.PORT}`);
    logger.info(`🌐 CORS origin: ${env.CLIENT_URL}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down…`);
    server.close(async () => {
      await pool.end();
      logger.info('✔ Closed HTTP server and DB pool.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { err });
  });
}

bootstrap();
