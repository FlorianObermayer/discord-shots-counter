import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnection, DiscordGatewayAdapterCreator, StreamType, CreateAudioResourceOptions } from '@discordjs/voice';
import { resolve } from 'path';
import fs from 'fs';
import { Guild } from 'discord.js';

export class AudioPlayerManager {
    activeTimers: Map<any, any>;
    guildId: string;
    adapterCreator: any;

    constructor(guild: Guild) {
        this.activeTimers = new Map();
        this.guildId = guild.id;
        this.adapterCreator = guild.voiceAdapterCreator;
    }

    async joinVoiceChannel(voiceChannelId: string) {
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: this.guildId,
            adapterCreator: this.adapterCreator,
        });
        return connection;
    }

    async playAudioFile(connection: VoiceConnection, filePath: string) {
        const absolutePath = resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Audio file missing: ${filePath}`);
        }

        const player = createAudioPlayer();
        const resource = createAudioResource(absolutePath, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true
        });

        player.play(resource);
        connection.subscribe(player);

        return new Promise<void>((resolve) => {
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                resolve();
            });
        });
    }

    async startRandomPlayback(voiceChannelId: string, audioSources: string[], minDelay: number, maxDelay: number) {
        // First stop any existing playback for this channel
        this.stopPlayback(voiceChannelId);

        const playNext = async () => {
            try {
                const connection = await this.joinVoiceChannel(voiceChannelId);
                const randomSource = audioSources[Math.floor(Math.random() * audioSources.length)];

                await this.playAudioFile(connection, randomSource);

            } catch (error) {
                console.error('Playback error:', error);
            }

            // Schedule next playback with new random delay
            const delay = this.getRandomDelay(minDelay, maxDelay) * 1000; // convert to milliseconds
            const timer = setTimeout(() => playNext(), delay);
            this.activeTimers.set(`${this.guildId}-${voiceChannelId}`, timer);
        };

        // Start the first playback immediately
        playNext();
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