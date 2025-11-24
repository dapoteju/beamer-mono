// src/config/config.ts
import 'dotenv/config';

type NodeEnv = 'development' | 'test' | 'production';

interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
}

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const config: AppConfig = {
  nodeEnv: (process.env.NODE_ENV as NodeEnv) || 'development',
  port: Number(getEnv('PORT', '3000')),
  databaseUrl: getEnv('DATABASE_URL'),
  jwtSecret: getEnv('JWT_SECRET'),
};

export default config;
