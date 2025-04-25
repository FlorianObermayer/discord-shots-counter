export function verifyEnv() {
  if (!process.env.APP_ID || !process.env.DISCORD_TOKEN || !process.env.PUBLIC_KEY) {
    throw new Error('Missing required environment variables: APP_ID, DISCORD_TOKEN, PUBLIC_KEY');
  }
}

export function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' ||
    process.env.MOCHA_RUNNING === 'true';
}

export function databasePath() {
  return process.env.DB_PATH || './database.db';
}