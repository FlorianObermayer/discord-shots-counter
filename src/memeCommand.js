import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import axios from 'axios';
import fs from 'fs';

const audioPlayer = new AudioPlayerManager();
const MEME_API_URL = 'https://myinstants-api.vercel.app/best?q=de';
const MEMES_DIR = './media/audio/memes';

export async function handleMemeCommand(interaction, client) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMemePath = (await getCachedOrDownloadMemes(1)).pop();
        const connection = await audioPlayer.joinVoiceChannel(guild, voiceChannelId);
        audioPlayer.playAudioFile(connection, randomMemePath);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing **${randomMemePath.split("/").pop()}** in your voice channel`
            }
        };
    } catch (error) {
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

export async function getCachedOrDownloadMemes(count = -1) {
    // Get memes from API
    const response = await axios.get(MEME_API_URL);
    const memeUrls = response.data.data.map(meme => meme.mp3);
    const memePaths = [];
    // download up to 10 random memes to local storage

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
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        memePaths.push(filePath);
    }
    return memePaths;
}

export async function handleStartRandomMemes(interaction, client, minDelay, maxDelay) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const memePaths = await getCachedOrDownloadMemes(10);

        audioPlayer.startRandomPlayback(guild, voiceChannelId, memePaths, minDelay, maxDelay);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Started random memes in your voice channel`
            }
        };
    } catch (error) {
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

export async function handleStopRandomMemes(interaction, client) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        audioPlayer.stopPlayback(guild.id, voiceChannelId);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `⏹ Stopped random memes in your voice channel`
            }
        };
    } catch (error) {
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