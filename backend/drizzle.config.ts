import type { Config } from "drizzle-kit";

declare const process: { env: Record<string, string | undefined> };

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL not found in environment");
  throw new Error("DATABASE_URL is required for database operations");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
