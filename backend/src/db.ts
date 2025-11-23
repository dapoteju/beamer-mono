// src/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import config from './config/config';
import * as schema from './db/schema';

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const db = drizzle(pool, { schema });

// Optional helper
export const query = (text: string, params?: any[]) => pool.query(text, params);
