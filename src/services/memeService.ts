import axios from 'axios';
import fs from 'fs';
import { mediaPath, defaultMemeAPIQuery } from '../envHelper.js';
import path from 'path';
import { MemeQuery } from '../types/memes.js';
import logger from '../logger.js';

const MEMES_DIR = path.join(mediaPath(), '/audio/memes');
const MEME_API_BASE_URL = 'https://myinstants-api.vercel.app/';

export interface IMemeService {
    warmupMemeCache(): Promise<void>;
    getCachedOrDownloadMemes(count: number | undefined, memeQuery: MemeQuery, customMemeQuery: string | undefined): Promise<string[]>;
}

interface IMemeServiceFactory {
    create(): IMemeService;
}

class MemeService implements IMemeService {
    async warmupMemeCache(): Promise<void> {
        try {
            logger.info('Warming up meme cache...');
            await this.getCachedOrDownloadMemes();
            logger.info('Warming up meme cache... DONE');
        } catch (error) {
            logger.error('Warming up meme cache... FAILED', error);

        }
    }

    async getCachedOrDownloadMemes(count: number | undefined = undefined, memeQuery: MemeQuery = 'Default', customMemeQuery: string | undefined = undefined) : Promise<string[]> {
        // Get memes from API
        const response = await axios.get<{ data: { mp3: string }[] }>(path.join(MEME_API_BASE_URL, getMemeQuery(memeQuery, customMemeQuery)));
        const memeUrls = response.data.data.map((it) => it.mp3);
        const memePaths = [];
        // Download up to 10 random memes to local storage

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
    }

}

function getMemeQuery(query: MemeQuery, custom: string | undefined) {
    // see https://github.com/abdipr/myinstants-api?tab=readme-ov-file#-examples
    const memeQueryMap: { [key in MemeQuery]: string } = {
        'Default': defaultMemeAPIQuery() || 'best?q=de',
        Trending: 'trending?q=us',
        'Trending (German)': 'trending?q=de',
        Best: 'best',
        'Best (German)': 'best?q=de',
        'Rocket League': 'search?q=rocket+league',
        'Recent': 'recent',
        Custom: custom!
    };

    return memeQueryMap[query];
}

export const memeServiceFactory: IMemeServiceFactory = {
    create(): IMemeService {
        return new MemeService();
    }
};