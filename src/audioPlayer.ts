import { AudioPlayerStatus, DiscordGatewayAdapterCreator, StreamType, VoiceConnection, createAudioPlayer, createAudioResource, joinVoiceChannel } from '@discordjs/voice';
import { Guild } from 'discord.js';
import fs from 'fs';
import { resolve as pathResolve } from 'path';

export class AudioPlayerManager {
    activeTimers: Map<string, NodeJS.Timeout>;
    guildId: string;
    adapterCreator: DiscordGatewayAdapterCreator;

    constructor(guild: Guild) {
        this.activeTimers = new Map();
        this.guildId = guild.id;
        this.adapterCreator = guild.voiceAdapterCreator;
    }

    joinVoiceChannel(voiceChannelId: string) {
        const connection = joinVoiceChannel({
            adapterCreator: this.adapterCreator,
            channelId: voiceChannelId,
            guildId: this.guildId,
        });
        return connection;
    }

    async playAudioFile(connection: VoiceConnection, filePath: string) {
        const
            absolutePath = pathResolve(filePath),
            player = createAudioPlayer(),
            resource = createAudioResource(absolutePath, {
                inlineVolume: true,
                inputType: StreamType.Arbitrary
            });

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Audio file missing: ${filePath}`);
        }

        player.play(resource);
        connection.subscribe(player);

        return new Promise<void>((resolve) => {
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                resolve();
            });
        });
    }

    startRandomPlayback(voiceChannelId: string, audioSources: string[], minDelay: number, maxDelay: number) {
        // First stop any existing playback for this channel
        this.stopPlayback(voiceChannelId);

        const playNext = async () => {
            try {
                const connection = this.joinVoiceChannel(voiceChannelId);

                if (audioSources.length === 0) {
                    throw new Error('audioSources is empty');
                }
                const randomSource = audioSources[Math.floor(Math.random() * audioSources.length)]!;
                await this.playAudioFile(connection, randomSource);

            } catch (error) {
                console.error('Playback error:', error);
            }

            // Schedule next playback with new random delay
            const delay = this.getRandomDelay(minDelay, maxDelay) * 1000, // Convert to milliseconds
                timer = setTimeout(() => { void playNext(); }, delay);
            this.activeTimers.set(`${this.guildId}-${voiceChannelId}`, timer);
        };

        // Start the first playback after an initial delay
        const initialDelay = this.getRandomDelay(minDelay, maxDelay) * 1000;
        const initialTimer = setTimeout(() => { void playNext(); }, initialDelay);
        this.activeTimers.set(`${this.guildId}-${voiceChannelId}`, initialTimer);
    }

    stopPlayback(voiceChannelId: string) {
        const timer = this.activeTimers.get(`${this.guildId}-${voiceChannelId}`);
        if (timer) {
            clearTimeout(timer);
            this.activeTimers.delete(`${this.guildId}-${voiceChannelId}`);
        }
    }

    private getRandomDelay(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}