import { MongoClient, ServerApiVersion } from 'mongodb';
import fs from 'fs'
const uri = `mongodb+srv://vined:NuhUh@cluster0.py8fc90.mongodb.net/?retryWrites=true&w=majority`;

export class ChatDB {
  constructor() {
    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        deprecationErrors: true
      }
    });
    this.db = this.client.db('6b6t');
    this.chat = this.db.collection('Chat');
  }

  async savePlayer(playerName, playerData, rank, list, data) {
    try {
      const currentTimeUnix = Math.floor(new Date().getTime() / 1000);
      const lastSeenData = {
        timestamp: currentTimeUnix,
        ping: playerData?.ping || 0,
        uuid: playerData?.uuid || null
      };

      const setOnInsert = {
        'messages': [],
        'joins': [],
        'leaves': [],
        'deaths': [],
        'lastSeen': lastSeenData,
      };

      let filter = { _id: playerName }
      if (list === 'messages') {
        const options = { upsert: true };

        const updateResult = await this.chat.updateOne(filter, { $push: { [list]: data }, $set: { 'lastSeen': lastSeenData, 'rank': rank } });

        if (updateResult.modifiedCount === 0) {
          await this.chat.updateOne(filter, { $setOnInsert: setOnInsert }, options);
        }
      } else {
        const updateResult = await this.chat.updateOne(filter, { $push: { [list]: data }, $set: { 'lastSeen': lastSeenData } });

        if (updateResult.modifiedCount === 0) {
          await this.chat.updateOne(filter, { $setOnInsert: setOnInsert });
        }
      }

    } catch (error) {
      console.log(error);
    }
  }

  async getPlayer(playerName) {
    try {
      const player = await this.chat.findOne({ _id: playerName });
      return player;
    } catch (error) {
      throw new Error(`Failed to retrieve player data: ${error.message}`);
    }
  }

  async getChatStats() {
    try {
      const stats = await this.chat.stats();
      return stats;
    } catch (error) {
      throw new Error(`Failed to retrieve chat stats: ${error.message}`);
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
      const players = await this.chat.distinct('_id', {}, {});
      return players;
    } catch (error) {
      throw new Error(`Failed to retrieve player list: ${error.message}`);
    }
  }
}