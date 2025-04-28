import { AllCommands } from './commands';
import { appId, discordToken } from './envHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DiscordRequest(endpoint: string, options: { body?: any, method?: string } | undefined) {
  // Append endpoint to root API URL
  const url = `https://discord.com/api/v10/${endpoint}`;
  // Stringify payloads
  if (options && options.body) {
    options.body = JSON.stringify(options.body);
  }
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordToken()}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    ...options
  });
  // Throw API errors
  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // Return original response
  return res;
}

export async function installGlobalCommands(appId: string, commands: Command[] = AllCommands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    console.log(`Registering following commands: ${commands.map(it => it.name as string).join(',')}...`);
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    console.log('Registering commands DONE');

  } catch (err) {
    console.log('Registering commands FAILED');
    console.error(err);
  }
}
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getAllOpenShotsFormatted(shots: { name: string, open_shots: number }[]) {
  // Format the shots object into an ASCII table with player names and open shots
  let formattedShots = '```\n';
  formattedShots += 'Player Name       | Open Shots\n';
  formattedShots += '------------------|-----------\n';
  for (const player of shots) {
    formattedShots += `${player.name.padEnd(18)}| ${player.open_shots}\n`;
  }
  formattedShots += '```';
  return formattedShots;
}

export async function getUsernameFromId(id: string) {
  // Fetch the username from the Discord API using the user ID
  const res = await DiscordRequest(`/users/${id}`, {
    method: 'GET',
  });
  const user = await res.json() as { username: string };
  // Return the user's handle or throw an error if not found
  if (user)
    // Format the username as @username
  { return `@${user.username}`; }
  throw new Error('User not found');
}

export async function deletePreviousMessage(token: string, messageId: string) {
  const endpoint = `webhooks/${appId()}/${token}/messages/${messageId}`;
  await DiscordRequest(endpoint, { method: 'DELETE' });
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}