import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import axios from 'axios';

const audioPlayer = new AudioPlayerManager();
const MEME_API_URL = 'https://myinstants-api.vercel.app/best?q=de';

export async function handleStartRandomMemes(interaction, client, minDelay, maxDelay) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        // Get memes from API
        const response = await axios.get(MEME_API_URL);
        const memeUrls = response.data.data.map(meme => meme.mp3);

        audioPlayer.startRandomPlayback(guild, voiceChannelId, memeUrls, minDelay, maxDelay);

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
                content: `❌ Failed to start random memes\n\n\`\`\`${error.message}\`\`\``
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
                content: `❌ Failed to stop random memes\n\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}