import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getOrCreateAudioPlayerManager } from './audioPlayer';

import { mediaPath } from './envHelper';
import logger from './logger';

export const MOTIVATIONS_DIR = path.join(mediaPath(), '/audio/motivations');
export const MIMIMI_DIR = path.join(mediaPath(), 'audio/mimimi');

function getRandomFilePathFromDirectory(directoryPath: string): string {
    const filePaths = fs.readdirSync(directoryPath).map(file => path.join(directoryPath, file));
    if (!filePaths || filePaths.length === 0) {
        throw new Error(`empty or non existing directory: ${directoryPath}`);
    }
    return filePaths[Math.floor(Math.random() * filePaths.length)]!;
}

export async function handleAudioCommand(guildId: string, userId: string, client: Client, audioSourceDirectory: string) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMP3 = getRandomFilePathFromDirectory(audioSourceDirectory);
        const audioPlayer = getOrCreateAudioPlayerManager(guild);
        const connection = audioPlayer.joinVoiceChannel(voiceChannelId);

        void audioPlayer.playAudioFile(connection, randomMP3);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '🎧 Playing audio clip in your voice channel'
            }
        };
    } catch (error: unknown) {
        logger.error('Audio command error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to play audio\n\`\`\`${errorMessage}\`\`\``
            }
        };
    }
}