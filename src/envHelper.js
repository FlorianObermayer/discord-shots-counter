import dotenv from 'dotenv';

export function init() {

  const envFileName = `.env.${process.env.NODE_ENV || "development"}`
  dotenv.config({ path: envFileName });

  if (!process.env.APP_ID || !process.env.DISCORD_TOKEN || !process.env.PUBLIC_KEY) {
    throw new Error('Missing required environment variables: APP_ID, DISCORD_TOKEN, PUBLIC_KEY');
  }
  console.log(`Using environment file: ${envFileName}`);
}

export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' ||
    process.env.MOCHA_RUNNING === 'true';
}

export function databasePath() {
  return process.env.DB_PATH || './database.db';
}