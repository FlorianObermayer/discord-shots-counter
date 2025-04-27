// motivationCommand.js
import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import fs from 'fs';

const MOTIVATIONS_DIR = './media/audio/motivations';
const MOTIVATION_FILES = fs.readdirSync(MOTIVATIONS_DIR).map(file => `${MOTIVATIONS_DIR}/${file}`);

const audioPlayer = new AudioPlayerManager();

export async function handleMotivationCommand(interaction, client) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMP3 = MOTIVATION_FILES[Math.floor(Math.random() * MOTIVATION_FILES.length)];
        const connection = await audioPlayer.joinVoiceChannel(guild, voiceChannelId);

        audioPlayer.playAudioFile(connection, randomMP3);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing motivation in your voice channel`
            }
        };
    } catch (error) {
        console.error('Motivation command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to play motivation\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}