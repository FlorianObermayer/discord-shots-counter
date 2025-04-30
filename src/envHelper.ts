import path from 'path';

export function verifyEnv() {
  appId();
  discordToken();
  publicKey();
}

export function isTestEnvironment() {
  return process.env['NODE_ENV'] === 'test' ||
    process.env['MOCHA_RUNNING'] === 'true';
}

export function databasePath() {
  return process.env['DB_PATH'] || './';
}

export function databaseFile() {
  return path.join(databasePath(), 'database.db');
}

export function cacheFolder() {
  return path.join(databasePath(), '.cache');
}

export function mediaPath() {
  return process.env['MEDIA_PATH'] || './media';
}

export function appId() {
  return ensureEnv('APP_ID');
}

export function llmApiKey() {
  return process.env['LLM_API_KEY'];
}

export function discordToken() {
  return ensureEnv('DISCORD_TOKEN');
}

export function port() {
  return process.env['PORT'] || '3000';
}

export function publicKey() {
  return ensureEnv('PUBLIC_KEY');
}

export function defaultMemeAPIQuery() {
  return process.env['DEFAULT_MEME_API_QUERY'];
}

function ensureEnv(envName: string): string {
  const result = process.env[envName];

  if (result === undefined) {
    throw new Error(`${envName} environment variable is not defined`);
  }

  return result;
}