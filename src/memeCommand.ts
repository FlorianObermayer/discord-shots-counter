import { InteractionResponseFlags, InteractionResponseType } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import axios from 'axios';
import fs from 'fs';
import { Client } from 'discord.js';
import { getErrorMessage } from './utils.js';

const MEMES_DIR = './media/audio/memes',
    MEME_API_URL = 'https://myinstants-api.vercel.app/best?q=de';

export async function getCachedOrDownloadMemes(count = -1) {
    // Get memes from API
    const response = await axios.get<{ data: { mp3: string }[] }>(MEME_API_URL);
    const memeUrls = response.data.data.map((it) => it.mp3);
    const memePaths = [];
    // Download up to 10 random memes to local storage

    // Ensure memes directory exists
    if (!fs.existsSync(MEMES_DIR)) {
        fs.mkdirSync(MEMES_DIR, { recursive: true });
    }

    const filteredMemeUrls = count > 0 ? memeUrls.sort(() => 0.5 - Math.random()).slice(0, count) : memeUrls;
    for (const meme of filteredMemeUrls) {
        const memeResponse = await axios.get<ReadableStream>(meme, { responseType: 'stream' }),
            fileName = meme.split('/').pop(),
            filePath = `${MEMES_DIR}/${fileName}`;
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

export async function handleMemeCommand(guildId: string, userId: string, client: Client) {
    try {
        const guild = await client.guilds.fetch(guildId),
            member = await guild.members.fetch(userId),
            voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMemePath = (await getCachedOrDownloadMemes(1)).pop();

        if (randomMemePath === undefined) {
            throw new Error('randomMemePath not found');
        }

        const audioPlayer = new AudioPlayerManager(guild);
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
        console.error('Meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to start random memes\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}

export async function handleStartRandomMemes(guildId: string, userId: string, client: Client, minDelay: number, maxDelay: number) {
    try {
        const guild = await client.guilds.fetch(guildId),
            member = await guild.members.fetch(userId),
            voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const memePaths = await getCachedOrDownloadMemes(10),


            audioPlayer = new AudioPlayerManager(guild);

        audioPlayer.startRandomPlayback(voiceChannelId, memePaths, minDelay, maxDelay);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '🎧 Started random memes in your voice channel'
            }
        };
    } catch (error: unknown) {
        console.error('Meme command error:', error);
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

        const audioPlayer = new AudioPlayerManager(guild);

        audioPlayer.stopPlayback(voiceChannelId);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '⏹ Stopped random memes in your voice channel'
            }
        };
    } catch (error: unknown) {
        console.error('Stop meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to stop random memes\n\`\`\`${getErrorMessage(error)}\`\`\``
            }
        };
    }
}