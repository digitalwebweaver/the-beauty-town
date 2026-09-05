import type { CorsOptions } from 'cors';
import { env, isDev } from './env';

// The localhost origins are only ever useful against a dev server — dead
// weight in production, and confusing to see in a CORS config while
// auditing a prod deploy for "is this actually locked down".
const allowedOrigins = new Set(
  [env.CLIENT_URL, ...(isDev ? ['http://localhost:5173', 'http://localhost:5174'] : [])].filter(
    Boolean
  )
);

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
