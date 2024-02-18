import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs'
const uri = `mongodb+srv://vined:NuhUh@cluster0.py8fc90.mongodb.net/?retryWrites=true&w=majority`;

export class SpawnDB {
    constructor() {
        this.client = new MongoClient(uri, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: true,
                deprecationErrors: true,
            }
        });
        this.db = this.client.db('6b6t');
        this.spawn = this.db.collection('Spawn');
    }

    async savePlayer(playerName, playerUuid, data) {
        try {
            const filter = { _id: playerName };
            const setOnInsert = {
                uuid: playerUuid,
                'playerData': [],
            };

            const update = {
                $push: { 'playerData': data },
            };

            const options = { upsert: true };
            let updateResult = await this.spawn.updateOne(filter, update, options);

            if (updateResult.modifiedCount === 0) {
                await this.spawn.updateOne(filter, { $setOnInsert: setOnInsert }, options);
            }
        } catch (error) {
            throw new Error(`Failed to save player data: ${error.message}`);
        }
    }

    async getPlayer(playerName) {
        try {
            const player = await this.spawn.findOne({ _id: playerName });
            return player;
        } catch (error) {
            throw new Error(`Failed to retrieve player data: ${error.message}`);
        }
    }

    async getSpawnStats() {
        try {
            const stats = await this.spawn.stats();
            return stats;
        } catch (error) {
            throw new Error(`Failed to retrieve spawn stats: ${error.message}`);
        }
    }

    async disconnect() {
        try {
            await this.client.close();
        } catch (error) {
            throw new Error(`Failed to disconnect from the database: ${error.message}`);
        }
    }

    async getAllPlayers() {
        try {
            const players = await this.spawn.distinct('_id', {}, {});
            return players;
        } catch (error) {
            throw new Error(`Failed to retrieve player list: ${error.message}`);
        }
    }
}