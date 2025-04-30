import { Client } from 'discord.js';
import { getOrCreateAudioPlayerManager } from './audioPlayer';
import logger from './logger';

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

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}
export async function insultViaTTS(guildId: string, offender: string, client: Client, insultText: string) {
  try {
    logger.info('Insult via TTS...');

    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(offender);
    const voiceChannelId = member.voice?.channelId;

    if (voiceChannelId !== null) {
      const audioPlayerManager = getOrCreateAudioPlayerManager(guild);
      await audioPlayerManager.playTTS(voiceChannelId, insultText);
      logger.info('Insult via TTS... DONE');
    } else {
      logger.info('Insult via TTS... CANCELED (no voice Channel available)');
    }
  } catch (error) {
    logger.warn('Insult TTS...FAILED', error);
  }
}
