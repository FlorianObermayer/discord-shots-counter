import { IDatabaseService } from './databaseService';
import usernameCache from '../usernameCache';
import { generateInsult } from '../deepseekTextProvider';
import { create, FlatCache } from 'flat-cache';
import { cacheFolder } from '../envHelper';
import logger from '../logger';
import { getViolationTypes, ViolationType } from '../types/violations';

function cacheKey(username: string, violationType: ViolationType): string {
    return `${username}|${violationType}`;
}

export interface IInsultService {
    warmupInsultsCache(): Promise<void>;
    getAndCreateInsult(userId: string, violationType: ViolationType): Promise<string>;
}

interface IInsultServiceFactory {
    create(db: IDatabaseService) : IInsultService
}

class InsultService implements IInsultService{
    private db: IDatabaseService;
    private cache: FlatCache;

    constructor(db: IDatabaseService,) {
        this.db = db;

        this.cache = create({
            cacheDir: cacheFolder(),
            persistInterval: 1 * 60 * 1000, // 1 minute
            cacheId: 'insults'
        });
    }

    public async warmupInsultsCache() {
        try {
            logger.info('Warming up Insults Cache...');
            const allPlayerNames = await this.getAllPlayerNames();
            const violationTypes = getViolationTypes();
            for (const username of allPlayerNames) {
                for (const violationType of violationTypes) {
                    const key = cacheKey(username, violationType);
                    if (!this.cache.cache.has(key)) {
                        const insult = await this.generateInsult(username, violationType);
                        this.cache.set(key, insult);
                    }
                }
            }

            this.cache.save();
            logger.info('Warming up Insults Cache...DONE');
        } catch (error) {
            logger.error('Warming up Insults Cache... ERROR', error);
        }
    }

    private async getAllPlayerNames(): Promise<string[]> {

        const playerIds = await this.db.getAllPlayers();
        const playerHandles = await Promise.all(
            playerIds.map(it => usernameCache.getUsername(it.player_id))
        );
        return playerHandles;
    }

    async getAndCreateInsult(userId: string, violationType: ViolationType): Promise<string> {

        const username = await usernameCache.getUsername(userId);
        const key = cacheKey(username, violationType);
        let currentInsult: string | undefined = this.cache.get(key);
        this.cache.delete(key);

        if (!currentInsult) {
            logger.warn('no insult found in cache, falling back to pre-generated insult');
            currentInsult = this.getRandomBackupInsult(violationType);
        }

        // Add a new insult to the cache but don't block doing that
        void (async () => {
            try {
                logger.debug('prefetching new insult...');
                const newInsult = await generateInsult(username, violationType);
                this.cache.set(key, newInsult);
                this.cache.save();
                logger.debug('prefetching new insult... DONE');
                logger.debug('new insult:', newInsult);

            } catch (error) {
                logger.warn('prefetching new insult... FAILED', error);
            }
        })();

        return currentInsult;
    }

    private async generateInsult(username: string, violationType: ViolationType): Promise<string> {
        try {
            return await generateInsult(username, violationType);
        } catch (error) {
            logger.warn('generateInsult FAILED => fallback to hardcoded insults');
            logger.error(error);

            return this.getRandomBackupInsult(violationType);
        }
    }

    private getRandomBackupInsult(violationType: ViolationType
    ): string {
        const insults = BackupInsults[violationType];
        const randomIndex = Math.floor(Math.random() * insults.length);
        return insults[randomIndex]!;
    }
}

const BackupInsults: {
    [key in ViolationType]: string[];
} = {
    'Toxic towards the Team': [
        'Calling your teammates trash? Congrats, you’ve unlocked ‘Drink Every Time They Whiff’ mode.',
        'If toxicity was a Rocket League rank, you’d be SSL. Unfortunately, it’s not. Bottoms up!',
        'The only thing worse than your insults is your rotation. Take a sip of shame.',
    ],
    'Toxic towards the Opponents': [
        'Trash-talking the enemy? Enjoy drinking every time they demo you—which will be often.',
        'You type faster than you play. Take a shot for every toxic quick-chat you spam.',
        'The only thing you’re winning is the ‘Most Likely to Rage Quit’ award. Drink up, loser.',
    ],
    'Toxic towards themselves': [
        'Calling yourself garbage? We agree. Chug until you improve (or pass out).',
        'Self-deprecation is only funny if it’s ironic. Yours is just sad. Drink to forget.',
        'If you hate yourself this much, wait until you see your rank after drinking. Bottoms up!',
    ],
    'Own Goal': [
        'Scoring for the other team? That’s not an accident—it’s treason. Drink in disgrace.',
        'Own goals are just advanced mind games… right? Right? (Take a shot, clown).',
        'The only thing you’re carrying is the enemy team. Chug while they thank you.',
    ],
    'Saved Own Shot': [
        'Blocking your own shot is like high-fiving a wall—pointless and embarrassing. Drink.',
        'You had ONE job. Now take a shot for every goal your ‘save’ cost the team.',
        'Your defense is so bad, even your own shots don’t feel safe. Bottoms up!',
    ],
    'Lying about Things': [
        '‘I lagged’? Sure, and I’m Squishy. Drink twice—once for the lie, once for your ego.',
        'The only thing worse than your excuses is your gameplay. Chug to numb the pain.',
        'Keep lying and we’ll start a drinking game just for your terrible excuses.',
    ],
};

export const insultServiceFactory: IInsultServiceFactory = {
    create: function (db: IDatabaseService): IInsultService {
        return new InsultService(db);
    }
};