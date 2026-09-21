import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing DATABASE_URL — server-only env var, see .env.example.');
}

export const db = drizzle(neon(DATABASE_URL), { schema });
