import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { getOrCreateAudioPlayerManager } from '../audioPlayer.js';
import { Client } from 'discord.js';
import { getErrorMessage } from '../utils.js';
import logger from '../logger.js';
import { MemeQuery } from '../types/memes.js';
import { IMemeService } from '../services/memeService.js';

export async function handleMemeCommand(memeService: IMemeService, guildId: string, userId: string, client: Client, memeQuery: MemeQuery, customSearchQuery: string | undefined) {
    try {
        validateMemeQuery(memeQuery, customSearchQuery);

        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('❌ You must be in a voice channel to use this command.');
        }

        const randomMemePath = await memeService.getRandomMemePath(memeQuery, customSearchQuery);

        if (randomMemePath === undefined) {
            if (memeQuery === 'Custom Search') {
                throw new Error(`❌ Searching \`${customSearchQuery}\` did not find any results.`);
            }

            throw new Error('this should not have happened...');
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
                content: `❌ Failed to load random meme\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}

export async function handleStartRandomMemes(memeService: IMemeService, guildId: string, userId: string, client: Client, minDelay: number, maxDelay: number, maxNumberOfDifferentMemes: number | undefined = 10, memeQuery: MemeQuery, customSearchQuery: string | undefined) {
    try {
        validateMemeQuery(memeQuery, customSearchQuery);

        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('❌ You must be in a voice channel to use this command.');
        }

        // running actual fetching and running in background to return fast
        void (async () => {
            try {
                const memePaths = await memeService.getCachedOrDownloadMemes(maxNumberOfDifferentMemes, memeQuery, customSearchQuery);

                if (memePaths.length === 0) {
                    if (memeQuery === 'Custom Search') {
                        throw new Error(`❌ Searching \`${customSearchQuery}\` did not find any results.`);
                    }

                    throw new Error('this should not have happened...');
                }

                const audioPlayer = getOrCreateAudioPlayerManager(guild);

                audioPlayer.startRandomPlayback(voiceChannelId, memePaths, minDelay, maxDelay);
            } catch (error) {
                logger.error('', error);
                throw error;
            }
        })();

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
            throw new Error('❌ You must be in a voice channel to use this command.');
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

function validateMemeQuery(memeQuery: MemeQuery, customSearchQuery: string | undefined) {
    if (memeQuery === 'Custom Search' && !customSearchQuery) {
        throw new Error('❌ Using `Custom Search` requires using the `custom_search_query` parameter.');
    };
}

