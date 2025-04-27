import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { resolve } from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';
import axios from 'axios';

export class AudioPlayerManager {
    constructor() {
        this.activeConnections = new Map();
        this.activeIntervals = new Map();
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

    startRandomPlayback(guild, voiceChannelId, audioSources, minDelay, maxDelay) {
        const intervalId = setInterval(async () => {
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
        }, this.getRandomDelay(minDelay, maxDelay));

        this.activeIntervals.set(`${guild.id}-${voiceChannelId}`, intervalId);
        return intervalId;
    }

    stopPlayback(guildId, voiceChannelId) {
        const intervalId = this.activeIntervals.get(`${guildId}-${voiceChannelId}`);
        if (intervalId) {
            clearInterval(intervalId);
            this.activeIntervals.delete(`${guildId}-${voiceChannelId}`);
        }
    }

    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}