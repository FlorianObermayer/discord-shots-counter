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
  return process.env['DB_PATH'] || './database.db';
}

export function mediaPath() {
  return process.env['MEDIA_PATH'] || './media';
}

export function appId(): string {
  return ensureEnv('APP_ID');
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

function ensureEnv(envName: string): string {
  const result = process.env[envName];

  if (result === undefined) {
    throw new Error(`${envName} environment variable is not defined`);
  }

  return result;
}