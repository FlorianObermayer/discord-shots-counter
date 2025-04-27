import { InteractionResponseType, InteractionResponseFlags } from 'discord-interactions';
import { AudioPlayerManager } from './audioPlayer.js';
import fs from 'fs';
import path from 'path';
import { mediaPath } from './envHelper.js';

export const MOTIVATIONS_DIR = path.join(mediaPath(), '/audio/motivations');
export const MIMIMI_DIR = path.join(mediaPath(), 'audio/mimimi');

const audioPlayer = new AudioPlayerManager();

function getRandomFilePathFromDirectory(directoryPath) {
    const filePaths = fs.readdirSync(directoryPath).map(file => path.join(directoryPath,file));
    if (!filePaths || filePaths.length == 0) {
        throw new Error(`empty or non existing directory: ${directoryPath}`);
    }
    return filePaths[Math.floor(Math.random() * filePaths.length)];
}

export async function handleAudioCommand(interaction, client, audioSourceDirectory) {
    try {
        const guild = await client.guilds.fetch(interaction.guild_id);
        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;

        if (!voiceChannelId) {
            throw new Error('You must be in a voice channel to use this command.');
        }

        const randomMP3 = getRandomFilePathFromDirectory(audioSourceDirectory);
        const connection = await audioPlayer.joinVoiceChannel(guild, voiceChannelId);

        audioPlayer.playAudioFile(connection, randomMP3);

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing audio clip in your voice channel`
            }
        };
    } catch (error) {
        console.error('Audio command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `❌ Failed to play audio\n\`\`\`${error.message}\`\`\``
            }
        };
    }
}