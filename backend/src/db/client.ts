// src/db/client.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("[Database] ERROR: DATABASE_URL is not set!");
  console.error("[Database] Available env vars:", Object.keys(process.env).filter(k => k.includes('PG') || k.includes('DATABASE')));
  throw new Error(
    "DATABASE_URL is not set. Please create a PostgreSQL database in the Replit interface."
  );
}

console.log("[Database] Connecting to database...");

const pool = new Pool({
  connectionString: dbUrl,
});

pool.on("error", (err) => {
  console.error("[Database] Pool error:", err);
});

export const db = drizzle(pool, { schema });

console.log("[Database] Database client initialized");
