import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { resolve } from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';
import axios from 'axios';

export class AudioPlayerManager {

    constructor() {
        this.activeTimers = new Map();
    }

    async joinVoiceChannel(guild, voiceChannelId) {
        const connection = joinVoiceChannel({
            channelId: voiceChannelId,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        return connection;
    }

    async playAudioFile(connection, filePath) {
        const absolutePath = resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Audio file missing: ${filePath}`);
        }

        const player = createAudioPlayer();
        const resource = createAudioResource(absolutePath, {
            inputType: 'mp3',
            inlineVolume: true,
            encoderArgs: ['-i', ffmpegPath]
        });

        player.play(resource);
        connection.subscribe(player);

        return new Promise((resolve) => {
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                resolve();
            });
        });
    }

    async playAudioUrl(connection, url) {
        const response = await axios.get(url, { responseType: 'stream' });
        const player = createAudioPlayer();
        const resource = createAudioResource(response.data, {
            inputType: 'mp3',
            inlineVolume: true,
            encoderArgs: ['-i', ffmpegPath]
        });

        player.play(resource);
        connection.subscribe(player);

        return new Promise((resolve) => {
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
                resolve();
            });
        });
    }

    async startRandomPlayback(guild, voiceChannelId, audioSources, minDelay, maxDelay) {
        // First stop any existing playback for this channel
        this.stopPlayback(guild.id, voiceChannelId);

        const playNext = async () => {
            try {
                const connection = await this.joinVoiceChannel(guild, voiceChannelId);
                const randomSource = audioSources[Math.floor(Math.random() * audioSources.length)];

                if (randomSource.startsWith('http')) {
                    await this.playAudioUrl(connection, randomSource);
                } else {
                    await this.playAudioFile(connection, randomSource);
                }
            } catch (error) {
                console.error('Playback error:', error);
            }

            // Schedule next playback with new random delay
            const delay = this.getRandomDelay(minDelay, maxDelay) * 1000; // convert to milliseconds
            const timer = setTimeout(() => playNext(), delay);
            this.activeTimers.set(`${guild.id}-${voiceChannelId}`, timer);
        };

        // Start the first playback immediately
        playNext();
    }

    stopPlayback(guildId, voiceChannelId) {
        const timer = this.activeTimers.get(`${guildId}-${voiceChannelId}`);
        if (timer) {
            clearTimeout(timer);
            this.activeTimers.delete(`${guildId}-${voiceChannelId}`);
        }
    }

    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}