import axios from 'axios';
import fs from 'fs';
import { mediaPath, defaultMemeAPIQuery, cacheFolder } from '../envHelper.js';
import path from 'path';
import { getMemeQueries, MemeQuery } from '../types/memes.js';
import logger from '../logger.js';
import { create, FlatCache } from 'flat-cache';

const MEMES_DIR = path.join(mediaPath(), '/audio/memes');
const MEME_API_BASE_URL = 'https://myinstants-api.vercel.app/';

export interface IMemeService {
    warmupMemeCache(): Promise<void>;
    getCachedOrDownloadMemes(count: number | undefined, memeQuery: MemeQuery, customMemeQuery: string | undefined): Promise<string[]>;
    getRandomMemePath(memeQuery: MemeQuery, customMemeQuery: string | undefined): Promise<string | undefined>;
}

interface IMemeServiceFactory {
    create(): IMemeService;
}

class MemeService implements IMemeService {

    nextMemeCache: FlatCache;

    constructor() {
        this.nextMemeCache = create({
            cacheDir: cacheFolder(),
            persistInterval: 1 * 60 * 1000, // 1 minute
            cacheId: 'memePaths'
        });
    }

    async warmupMemeCache(): Promise<void> {
        try {
            logger.info('Warming up meme cache...');
            for (const memeQuery of getMemeQueries()) {
                if (memeQuery === 'Custom Search') {
                    continue;
                }
                await this.getRandomMemePath(memeQuery, undefined, true);
            }
            this.nextMemeCache.save();
            logger.info('Warming up meme cache... DONE');
        } catch (error) {
            logger.error('Warming up meme cache... FAILED', error);
        }
    }

    async getRandomMemePath(memeQuery: MemeQuery, customSearchQuery: string | undefined, keepInCache: boolean = false): Promise<string | undefined> {
        const cacheKey = getMemeQuery(memeQuery, customSearchQuery);

        let currentMemePath = this.nextMemeCache.get(cacheKey);
        if (!currentMemePath) {
            logger.warn('Cache miss on meme path. Downloading meme... ', memeQuery);
            currentMemePath = (await this.getCachedOrDownloadMemes(1, memeQuery, customSearchQuery)).pop();
            if (!currentMemePath) {
                logger.warn('Cache miss on meme path. No memes found...', memeQuery, customSearchQuery);
            } else {
                logger.warn('Cache miss on meme path. Downloading meme... DONE', memeQuery);
                logger.debug('downloaded meme path', currentMemePath);
            }
        }
        if (!keepInCache) {
            this.nextMemeCache.delete(cacheKey);
        }
        // Add a new meme to the cache but don't block doing that
        void (async () => {
            try {
                logger.debug('prefetching new meme path...', memeQuery, customSearchQuery);
                const nextMemePath = (await this.getCachedOrDownloadMemes(1, memeQuery, customSearchQuery)).pop();
                this.nextMemeCache.set(cacheKey, nextMemePath);
                this.nextMemeCache.save();
                logger.debug('prefetching new meme path... DONE', memeQuery, customSearchQuery);
                logger.debug('new meme path', nextMemePath);
            } catch (error) {
                logger.warn('prefetching new meme path... FAILED', error);
            }
        })();

        return currentMemePath as string | undefined;
    }

    async getCachedOrDownloadMemes(count: number | undefined = undefined, memeQuery: MemeQuery = 'Default', customMemeQuery: string | undefined = undefined): Promise<string[]> {
        // Get memes from API
        const url = path.join(MEME_API_BASE_URL, getMemeQuery(memeQuery, customMemeQuery));
        const response = await axios.get<{
            data: { mp3: string }[],
            status: string
        }>(url);
        try {
            const memePaths: string[] = [];

            const statusOK = response.data.status === '200';
            if (!statusOK) {
                return memePaths;
            }
            const memeUrls = response.data?.data.map((it) => it.mp3);

            // Ensure memes directory exists
            if (!fs.existsSync(MEMES_DIR)) {
                fs.mkdirSync(MEMES_DIR, { recursive: true });
            }

            const filteredMemeUrls = count !== undefined && count > 0 ? memeUrls.sort(() => 0.5 - Math.random()).slice(0, Math.max(count, memeUrls.length)) : memeUrls;

            for (const meme of filteredMemeUrls) {
                const memeResponse = await axios.get<ReadableStream>(meme, { responseType: 'stream' });
                const fileName = meme.split('/').pop();
                const filePath = `${MEMES_DIR}/${fileName}`;

                // Only download if file does not exist
                if (fs.existsSync(filePath)) {
                    memePaths.push(filePath);
                    continue;
                }
                const writer = fs.createWriteStream(filePath);
                (memeResponse.data as unknown as NodeJS.ReadableStream).pipe(writer);
                await new Promise<void>((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });

                memePaths.push(filePath);
            }
            return memePaths;
        } catch (error) {
            logger.error('getCachedOrDownloadMemes failed', error, url, response);
            throw error;
        }
    }
}

function getMemeQuery(query: MemeQuery, customSearch: string | undefined) {
    // see https://github.com/abdipr/myinstants-api?tab=readme-ov-file#-examples
    const memeQueryMap: { [key in MemeQuery]: string } = {
        'Default': defaultMemeAPIQuery() || 'best?q=de',
        Trending: 'trending?q=us',
        'Trending (German)': 'trending?q=de',
        Best: 'best?q=us',
        'Best (German)': 'best?q=de',
        'Rocket League': 'search?q=rocket+league',
        'Recent': 'recent',
        'Custom Search': `search?q=${customSearch || ''}`
    };

    return memeQueryMap[query];
}

export const memeServiceFactory: IMemeServiceFactory = {
    create(): IMemeService {
        return new MemeService();
    }
};