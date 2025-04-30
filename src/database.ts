import sqlite3 from 'sqlite3';
import { databaseFile } from './envHelper';
import { ViolationType } from './violations';
import logger from './logger';

export class DatabaseService {
    sqlite: typeof sqlite3;
    databasePath: string;
    db: sqlite3.Database | null;
    connectionPromise: Promise<sqlite3.Database> | null;

    constructor(databasePath: string, sqliteModule = sqlite3) {
        this.sqlite = sqliteModule;
        this.databasePath = databasePath;
        this.db = null;
        this.connectionPromise = null;
    }

    private async ensureConnectedDB(): Promise<sqlite3.Database> {
        if (this.db) return this.db;
        if (this.connectionPromise) return await this.connectionPromise;

        this.connectionPromise = new Promise<sqlite3.Database>((resolve, reject) => {
            this.db = new this.sqlite.Database(this.databasePath, (err) => {
                if (err) {
                    logger.error('Database connection error:', err);
                    reject(err);
                } else {
                    logger.info(`Connected to ${this.databasePath} database`);
                    resolve(this.db!);
                }
            });
        });

        try {
            return await this.connectionPromise;
        } finally {
            this.connectionPromise = null;
        }
    }

    async disconnect(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }

    async _initializeDatabase(): Promise<void> {
        await this.runQuery(`
            CREATE TABLE IF NOT EXISTS shot_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id TEXT NOT NULL,
                violation_type TEXT NOT NULL,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                redeemed BOOLEAN DEFAULT 0
            )
        `);
    }

    private async runQuery<T>(sql: string, params: T[] = []): Promise<sqlite3.RunResult> {
        const db = await this.ensureConnectedDB();

        return new Promise<sqlite3.RunResult>((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    private async getQuery<T>(sql: string, params: unknown[] = []): Promise<T> {
        const db = await this.ensureConnectedDB();

        return new Promise((resolve, reject) => {
            db.get<T>(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    private async allQuery<T>(sql: string, params = []): Promise<T[]> {
        const db = await this.ensureConnectedDB();

        return new Promise((resolve, reject) => {
            db.all<T>(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async addShot(playerId: string, violationType: ViolationType): Promise<number> {
        const result = await this.runQuery(
            `INSERT INTO shot_results (player_id, violation_type)
             VALUES (?, ?)`,
            [playerId, violationType]
        );
        return result.lastID;
    }

    async getPlayerShots(playerId: string): Promise<{ total_shots: number; open_shots: number; redeemed_shots: number; }> {
        const row = await this.getQuery<{ total_shots: number, open_shots: number, redeemed_shots: number }>(
            `SELECT 
                COUNT(*) as total_shots,
                COUNT(CASE WHEN redeemed = 0 THEN 1 END) as open_shots,
                COUNT(CASE WHEN redeemed = 1 THEN 1 END) as redeemed_shots
             FROM shot_results 
             WHERE player_id = ?`,
            [playerId]
        );

        return row || {
            total_shots: 0,
            open_shots: 0,
            redeemed_shots: 0,
        };
    }

    async redeemShot(playerId: string) {
        try {
            await this.runQuery('BEGIN TRANSACTION');

            const row = await this.getQuery<{
                id: string;
                violation_type: ViolationType;
            }>(
                `SELECT id, violation_type
                 FROM shot_results
                 WHERE player_id = ? AND redeemed = 0 
                 ORDER BY id ASC
                 LIMIT 1`,
                [playerId]
            );

            if (!row) {
                await this.runQuery('ROLLBACK');
                return {
                    changes: 0,
                    redeemed: false,
                };
            }

            const result = await this.runQuery(
                `UPDATE shot_results 
                 SET redeemed = 1 
                 WHERE id = ?`,
                [row.id]
            );

            await this.runQuery('COMMIT');
            return {
                changes: result.changes,
                redeemed: true,
                violationType: row.violation_type
            };
        } catch (error) {
            await this.runQuery('ROLLBACK');
            throw error;
        }
    }

    async redeemAllShots(playerId: string) {
        const result = await this.runQuery(
            `UPDATE shot_results 
             SET redeemed = 1 
             WHERE player_id = ? AND redeemed = 0`,
            [playerId]
        );
        return result.changes;
    }

    async getAllOpenShots(): Promise<{ player_id: string, open_shots: number }[]> {
        return this.allQuery<{ player_id: string, open_shots: number }>(
            `SELECT player_id, COUNT(*) as open_shots
             FROM shot_results
             WHERE redeemed = 0
             GROUP BY player_id`
        );
    }

    async getLastShot(playerId: string): Promise<{
        violationType: ViolationType; date: Date;
        redeemed: boolean;
    } | null> {
        const row = await this.getQuery<{
            violation_type: ViolationType;
            added_at: string;
            redeemed: number;
        }>(
            `SELECT violation_type, added_at, redeemed
             FROM shot_results
             WHERE player_id = ?
             ORDER BY added_at DESC
             LIMIT 1`,
            [playerId]
        );

        if (row) {
            return {
                violationType: row.violation_type,
                date: new Date(`${row.added_at}Z`), // Ensure UTC parsing
                redeemed: row.redeemed === 1
            };
        }
        return null;
    }

    async getAllPlayers(): Promise<{ player_id: string }[]> {
        return this.allQuery<{ player_id: string }>(
            'SELECT DISTINCT player_id FROM shot_results'
        );
    }

}

// Factory function for creating database service instances
export async function createDatabaseService(path = databaseFile()) {
    const dbService = new DatabaseService(path);
    await dbService._initializeDatabase();
    return dbService;
}