import { getUsernameFromId } from './utils.js';

class UsernameCache {
    cache: Map<string, string>;
    constructor() {
        this.cache = new Map();
    }

    async getUsername(userId: string): Promise<string> {
        if (this.cache.has(userId)) {
            return this.cache.get(userId) as string;
        } 
            const username = await getUsernameFromId(userId);
            this.cache.set(userId, username);
            return username;

    }
}

export default new UsernameCache();