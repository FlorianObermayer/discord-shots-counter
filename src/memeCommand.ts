import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { getOrCreateAudioPlayerManager } from './audioPlayer.js';
import axios from 'axios';
import fs from 'fs';
import { Client } from 'discord.js';
import { getErrorMessage } from './utils.js';
import logger from './logger.js';
import { mediaPath, defaultMemeAPIQuery } from './envHelper.js';
import path from 'path';

const MEMES_DIR = path.join(mediaPath(), '/audio/memes');
const MEME_API_BASE_URL = 'https://myinstants-api.vercel.app/';

const memeQueries = ['Default', 'Trending', 'Trending (German)', 'Best', 'Best (German)', 'Rocket League', 'Recent', 'Custom'] as const;
export type MemeQuery = typeof memeQueries[number];
export function getMemeQueries(): readonly MemeQuery[] {
    return memeQueries;
}


export function getMemeQuery(query: MemeQuery, custom: string | undefined) {
    // see https://github.com/abdipr/myinstants-api?tab=readme-ov-file#-examples
    const memeQueryMap: { [key in MemeQuery]: string } = {
        'Default': defaultMemeAPIQuery() || 'best?q=de',
        Trending: 'trending?q=us',
        'Trending (German)': 'trending?q=de',
        Best: 'best',
        'Best (German)': 'best?q=de',
        'Rocket League': 'search?q=rocket+league',
        'Recent': 'recent',
        Custom: custom!
    };

    return memeQueryMap[query];
}

export async function getCachedOrDownloadMemes(count: number | undefined = undefined, memeQuery: MemeQuery = 'Default', customMemeQuery: string | undefined = undefined) {
    // Get memes from API
    const response = await axios.get<{ data: { mp3: string }[] }>(path.join(MEME_API_BASE_URL, getMemeQuery(memeQuery, customMemeQuery)));
    const memeUrls = response.data.data.map((it) => it.mp3);
    const memePaths = [];
    // Download up to 10 random memes to local storage

    // Ensure memes directory exists
    if (!fs.existsSync(MEMES_DIR)) {
        fs.mkdirSync(MEMES_DIR, { recursive: true });
    }

    const filteredMemeUrls = count !== undefined && count > 0 ? memeUrls.sort(() => 0.5 - Math.random()).slice(0, Math.max(count, memeUrls.length)) : memeUrls;

    for (const meme of filteredMemeUrls) {
        const memeResponse = await axios.get<ReadableStream>(meme, { responseType: 'stream' });
        const fileName = meme.split('/').pop();
        const filePath = `${MEMES_DIR}/${fileName}`;

        // Only download if file does not exist
        if (fs.existsSync(filePath)) {
            memePaths.push(filePath);
            continue;
        }
        const writer = fs.createWriteStream(filePath);
        (memeResponse.data as unknown as NodeJS.ReadableStream).pipe(writer);
        await new Promise<void>((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        memePaths.push(filePath);
    }
    return memePaths;
}

export async function handleMemeCommand(guildId: string, userId: string, client: Client, memeQuery: MemeQuery, customMemeQuery: string | undefined) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMemePath = (await getCachedOrDownloadMemes(1, memeQuery, customMemeQuery)).pop();

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

export async function handleStartRandomMemes(guildId: string, userId: string, client: Client, minDelay: number, maxDelay: number, maxNumberOfDifferentMemes: number | undefined = 10, memeQuery: MemeQuery, customMemeQuery: string | undefined) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const memePaths = await getCachedOrDownloadMemes(maxNumberOfDifferentMemes, memeQuery, customMemeQuery);
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