import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import axios from 'axios';
import fs from 'fs';
import { Client } from 'discord.js';

const MEME_API_URL = 'https://myinstants-api.vercel.app/best?q=de';
const MEMES_DIR = './media/audio/memes';

export async function getCachedOrDownloadMemes(count = -1) {
    // Get memes from API
    const response = await axios.get(MEME_API_URL);
    const memeUrls = response.data.data.map((meme: { mp3: any; }) => meme.mp3);
    const memePaths = [];
    // download up to 10 random memes to local storage

    // ensure memes directory exists
    if (!fs.existsSync(MEMES_DIR)) {
        fs.mkdirSync(MEMES_DIR, { recursive: true });
    }

    const filteredMemeUrls = count > 0 ? memeUrls.sort(() => 0.5 - Math.random()).slice(0, count) : memeUrls;
    for (const meme of filteredMemeUrls) {
        const memeResponse = await axios.get(meme, { responseType: 'stream' });
        const fileName = meme.split('/').pop();
        const filePath = `${MEMES_DIR}/${fileName}`;
        // only download if file does not exist
        if (fs.existsSync(filePath)) {
            memePaths.push(filePath);
            continue;
        }
        const writer = fs.createWriteStream(filePath);
        memeResponse.data.pipe(writer);
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
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMemePath = (await getCachedOrDownloadMemes(1)).pop();

        if (randomMemePath === undefined) {
            throw new Error("randomMemePath not found");
        }

        const audioPlayer = new AudioPlayerManager(guild);

        const connection = await audioPlayer.joinVoiceChannel(voiceChannelId);
        audioPlayer.playAudioFile(connection, randomMemePath);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing **${randomMemePath.split("/").pop()}** in your voice channel`
            }
        };
    } catch (error: any) {
        console.error('Meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to start random memes\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}

export async function handleStartRandomMemes(guildId: string, userId: string, client: Client, minDelay: number, maxDelay: number) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const memePaths = await getCachedOrDownloadMemes(10);


        const audioPlayer = new AudioPlayerManager(guild);

        audioPlayer.startRandomPlayback(voiceChannelId, memePaths, minDelay, maxDelay);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Started random memes in your voice channel`
            }
        };
    } catch (error: any) {
        console.error('Meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to start random memes\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}

export async function handleStopRandomMemes(guildId: string, userId: string, client: Client) {
    try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const audioPlayer = new AudioPlayerManager(guild);

        audioPlayer.stopPlayback(voiceChannelId);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `⏹ Stopped random memes in your voice channel`
            }
        };
    } catch (error: any) {
        console.error('Stop meme command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to stop random memes\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}