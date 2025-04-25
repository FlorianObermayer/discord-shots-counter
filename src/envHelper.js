import dotenv from 'dotenv';
import { existsSync } from 'fs';

export function init() {

  const envFileName = `.env.${process.env.NODE_ENV || "development"}`

  if (!existsSync(envFileName)) {
    throw new
      console.log(`Loading environment variables from ${envFileName}`);
  }
  dotenv.config({ path: envFileName });

  console.log(`Using environment file: ${envFileName}`);
}

export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' ||
    process.env.MOCHA_RUNNING === 'true';
}

export function databasePath() {
  return process.env.DB_PATH || './database.db';
}