import winston from 'winston';
import { env, isProd } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const rest = Object.keys(meta).length && !(meta as any).stack ? ` ${JSON.stringify(meta)}` : '';
  const stack = (meta as any).stack ? `\n${(meta as any).stack}` : '';
  return `${ts} ${level}: ${message}${rest}${stack}`;
});

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd
    ? combine(timestamp(), errors({ stack: true }), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
  transports: [new winston.transports.Console()],
});

logger.debug(`Logger initialized (${env.NODE_ENV})`);
