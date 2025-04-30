import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { getOrCreateAudioPlayerManager } from '../audioPlayer.js';
import { Client } from 'discord.js';
import { getErrorMessage } from '../utils.js';
import logger from '../logger.js';
import { MemeQuery } from '../types/memes.js';
import { IMemeService } from '../services/memeService.js';

export async function handleMemeCommand(memeService: IMemeService, guildId: string, userId: string, client: Client, memeQuery: MemeQuery, customMemeQuery: string | undefined) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMemePath = (await memeService.getCachedOrDownloadMemes(1, memeQuery, customMemeQuery)).pop();

        if (randomMemePath === undefined) {
            throw new Error('randomMemePath not found');
        }

        const audioPlayer = getOrCreateAudioPlayerManager(guild);
        const connection = audioPlayer.joinVoiceChannel(voiceChannelId);
        void audioPlayer.playAudioFile(connection, randomMemePath);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing **${randomMemePath.split('/').pop()}** in your voice channel`
            }
        };
    } catch (error: unknown) {
        logger.error('Meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to start random memes\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}

export async function handleStartRandomMemes(memeService: IMemeService, guildId: string, userId: string, client: Client, minDelay: number, maxDelay: number, maxNumberOfDifferentMemes: number | undefined = 10, memeQuery: MemeQuery, customMemeQuery: string | undefined) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const memePaths = await memeService.getCachedOrDownloadMemes(maxNumberOfDifferentMemes, memeQuery, customMemeQuery);
        const audioPlayer = getOrCreateAudioPlayerManager(guild);

        audioPlayer.startRandomPlayback(voiceChannelId, memePaths, minDelay, maxDelay);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '🎧 Started random memes in your voice channel'
            }
        };
    } catch (error: unknown) {
        logger.error('Meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to start random memes\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}

export async function handleStopRandomMemes(guildId: string, userId: string, client: Client) {
    try {
        const guild = await client.guilds.fetch(guildId),
            member = await guild.members.fetch(userId),
            voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const audioPlayer = getOrCreateAudioPlayerManager(guild);

        audioPlayer.stopPlayback(voiceChannelId);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '⏹ Stopped random memes in your voice channel'
            }
        };
    } catch (error: unknown) {
        logger.error('Stop meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to stop random memes\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}