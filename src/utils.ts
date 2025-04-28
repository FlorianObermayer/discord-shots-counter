import { appId, discordToken } from "./envHelper";

export async function DiscordRequest(endpoint: string, options: { body?: any, method?: string } | undefined) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options && options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${discordToken()}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId: string, commands: Command[]) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}
export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// TODO: Typing
export function getAllOpenShotsFormatted(shots: { [x: string]: any; }) {
  // Format the shots object into an ASCII table with player names and open shots
  let formattedShots = '```\n';
  formattedShots += 'Player Name       | Open Shots\n';
  formattedShots += '------------------|-----------\n';
  for (const playerId in shots) {
    const player = shots[playerId];
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
  const user = await res.json();
  // Return the user's handle or throw an error if not found
  if (user)
    // Format the username as @username
    return `@${user.username}`;
  throw new Error('User not found');
}

export async function deletePreviousMessage(token: string, messageId: string) {
  const endpoint = `webhooks/${appId()}/${token}/messages/${messageId}`;
  await DiscordRequest(endpoint, { method: 'DELETE' });
}