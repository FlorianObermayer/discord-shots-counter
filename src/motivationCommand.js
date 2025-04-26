import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import {
    InteractionResponseType, InteractionResponseFlags,
} from 'discord-interactions';
import { resolve } from 'path';
import fs from 'fs';

const MOTIVATIONS_DIR = './media/audio/motivations';
// List of your MP3 file paths
const MOTIVATION_FILES = fs.readdirSync(MOTIVATIONS_DIR).map(file => `${MOTIVATIONS_DIR}/${file}`);

export async function handleMotivationCommand(interaction, client) {
    try {

        const guildId = interaction.guild_id;

        const guild = await client.guilds.fetch(guildId);

        const member = await guild.members.fetch(interaction.member.user.id);
        const voiceChannelId = member.voice?.channelId;
        const channel = await guild.channels.fetch(voiceChannelId);

        // Check if user is in a voice channel
        if (!channel) {
            return {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.EPHEMERAL,
                    content: '❌ You need to be in a voice channel!'
                }
            };
        }

        // Select random MP3
        const randomMP3 = MOTIVATION_FILES[Math.floor(Math.random() * MOTIVATION_FILES.length)];
        const absolutePath = resolve(randomMP3);

        // Verify file exists
        if (!fs.existsSync(absolutePath)) {
            return {
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    flags: InteractionResponseFlags.EPHEMERAL,
                    content: `❌ Audio file missing: ${randomMP3}`
                }
            };
        }

        // Join and play audio
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: guildId,
            adapterCreator: guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const resource = createAudioResource(absolutePath);

        player.play(resource);
        connection.subscribe(player);

        // Cleanup
        player.on(AudioPlayerStatus.Idle, () => connection.destroy());

        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: `🎧 Playing in Channel [${channel.name}](${channel.url})`
            }
        };

    } catch (error) {
        console.error('Motivation command error:', error);
        return {
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
                flags: InteractionResponseFlags.EPHEMERAL,
                content: '❌ Failed to play motivation'
            }
        };
    }
}