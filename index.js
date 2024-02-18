import mineflayer from 'mineflayer';
import fs from 'fs';
import chalk from 'chalk';
import dateTime from 'node-datetime';
import express from 'express';
import repl from 'repl';
import WebSocket, { WebSocketServer } from 'ws';
import { ChatDB } from './db/chatdb.js';
import { SpawnDB } from './db/spawndb.js';
import {
  formatTimeOfDay,
  formatMoonPhase,
  random,
  range,
  sleep,
  makeid
} from './utils.js';

const CONFIG_PATH = './config.json';
const SERVER_PORT = 30981;
const PASSWORD = 'killyourselfnigger';
const HEARTBEAT = 41.25;

class bot {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.config = this.loadConfig();
    this.host = this.config.host;
    this.port = this.config.port;
    this.version = this.config.version;
    this.loggedIn = false;
    this.repl = repl.start('> ');
    this.chat = new ChatDB();
    this.spawn = new SpawnDB();
    this.connections = new Map();
    this.messages = [
      `./tpa ${this.username} to go to spawn!`,
      `Do you need to go to spawn? /tpa ${this.username}`,
      `If you need to go to spawn, just /tpa ${this.username}`,
      `./tpa ${this.username} if you need to go to spawn!`
    ];

    this.initApp();
    this.initWs();
    this.initBot();
  }

  loadConfig() {
    try {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      console.error('Error loading config file:', err);
      process.exit(1);
    }
  }

  initApp() {
    this.app = express();
    this.app.use(express.json());

    this.app.all('/', (req, res) => {
      res.send('Bot is logging');
    });

    this.app.get('/server', (req, res) => {
      console.log(req.socket.remoteAddress.replace("::ffff:", "") + " performed a GET /server request")
      res.json({
        isRaining: this.bot.isRaining,
        isThundering: this.bot.thunderState ? true : false,
        timeOfDay: formatTimeOfDay(this.bot.time.timeOfDay),
        timeOfDayTicks: this.bot.time.timeOfDay,
        day: Math.floor(this.bot.time.age / 24000),
        serverBrand: this.bot.game.serverBrand,
        moonPhase: formatMoonPhase(this.bot.time.moonPhase),
        players: this.bot.players
      });
    });

    this.server = this.app.listen(SERVER_PORT, () => {
      console.log(`Server listening at http://localhost:${SERVER_PORT}`);
    });
  }

  initWs() {
    this.wss = new WebSocketServer({ noServer: true });

    this.server.on('upgrade', (request, socket, head) => {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.handleWsConnection(ws, request);
      });
    });

    let host = this.server.address().address
    console.log(`WebSocket server is running on http://${host}:${SERVER_PORT}`);
  }

  handleWsConnection(ws, request) {
    const urlParams = new URLSearchParams(request.url.slice(request.url.indexOf('?') + 1));
    const password = urlParams.get('password');

    let ip = null;
    if (password === PASSWORD) {
      this.connections.set(ws, true);
      this.handleHeartbeat(ws, request);
      ip = request.socket.remoteAddress.replace("::ffff:", "");
      console.log(`${ip} connected to the websocket`);
    }

    ws.on('close', () => {
      if (this.connections.has(ws)) {
        this.connections.delete(ws);
      }
    });
  }

  handleHeartbeat(ws, request) {
    let heartbeatTimer = null;
    let ip = null;

    ws.on('message', (message) => {
      ip = request.socket.remoteAddress.replace("::ffff:", "");
      const data = JSON.parse(message.toString());
      if (data.type === 'heartbeat') {
        console.log(`Reset heartbeat timeout for ${ip}`)
        clearTimeout(heartbeatTimer);
        heartbeatTimer = setTimeout(() => {
          ws.terminate();
          console.log(`Connection ${ip} terminated due to initial heartbeat timeout`);
        }, HEARTBEAT * 1000);
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({
          'type': 'pong',
          'timestamp': Math.floor(new Date().getTime() / 1000)
        }))
      }
    });

    heartbeatTimer = setTimeout(() => {
      ip = request.socket.remoteAddress;
      ws.terminate();
      console.log(`Connection ${ip} terminated due to initial heartbeat timeout`);
    }, HEARTBEAT * 1000);
  }

  // Init bot instance
  initBot() {
    this.bot = mineflayer.createBot({
      username: this.username,
      host: this.host,
      port: this.port,
      version: this.version,
      skipValidation: true,
      hideErrors: false,
      chatLengthLimit: 9999,
      checkTimeoutInterval: 120 * 1000
    });

    this.loginCount = 0;
    this.loggedIn = false;
    this.bot.on('login', async () => await this.onLogin());
    this.bot.on('error', async (err) => await this.onError(err));
    this.bot.on('kicked', async (reason) => await this.onKicked(reason));
    this.bot.on('end', async () => await this.onEnd());
    this.bot.on('messagestr', async (message) => await this.onMessage(message));
    this.bot.on('whisper', async (username, message) => await this.onWhisper(username, message));
    this.bot.on('entitySpawn', async (entity) => await this.onEntitySpawn(entity));

  }

  // Logger
  log(...msg) {
    console.log(`[${this.username}]`, ...msg);
  }

  wsSend(data) {
    this.connections.forEach((value, connection) => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(data);
      }
    });
  }

  async onLogin() {
    let botSocket = this.bot._client.socket;
    this.log(chalk.green.bold(`Logged in to ${botSocket.server ? botSocket.server : botSocket._host}`));
    try {
      this.bot.chat(`/login ${this.password}`);
    } catch { }
    await this.bot.waitForTicks(80);
    this.bot.setControlState('forward', true);
    this.loginCount += 1;

    if (this.loginCount == 2) {
      this.loginCount = 0;
      this.log(chalk.magentaBright.bold(`Joined the main server`));
      this.loggedIn = true;
      this.repl.context.bot = this.bot;
      this.wsSend(JSON.stringify({
        timestamp: Math.floor(new Date().getTime() / 1000),
        type: 'connected'
      }))
      this.bot.setControlState('jump', true);
      this.bot.chat(`${random(this.messages)} ${makeid(10)}`);
    }
  };

  async onKicked(reason) {
    this.log(chalk.red.bold(`Disconnected: ${reason}`));
    this.bot.end();
  };

  async onError(err) {
    if (err.code == 'ECONNREFUSED') {
      this.log(chalk.red.bold(`Failed to connect to ${err.address}:${err.port}`))
      this.bot.end()
    } else {
      this.log(`Unhandled error: ${chalk.red.bold(err)}`);
      this.bot.end()
    }
  };

  async onEnd() {
    this.bot.removeAllListeners();
    let cooldown = random(range(3000, 7000));
    this.log(`Waiting ${chalk.yellow(Math.round((cooldown / 1000 + Number.EPSILON) * 100) / 100 + 's')} to reconnect`);
    setTimeout(() => this.initBot(), cooldown);
    clearInterval(this.realInterval);
    if (this.loggedIn == true) {
      this.wsSend(JSON.stringify({
        timestamp: Math.floor(new Date().getTime() / 1000),
        type: 'kicked'
      }))
      this.loggedIn = false;
    }
  };

  async onWhisper(message, username) {
    if (username == "vined_") {
      this.bot.chat(message)
    }
  };

  async onEntitySpawn(entity) {
    if (entity.type == 'player') {
      if (entity.username == this.username) return;
      let pos = entity.position
      console.log(entity)
      await this.spawn.savePlayer(entity.username, entity.uuid, {
        'yaw': entity.yaw,
        'pitch': entity.pitch,
        'x': pos.x,
        'y': pos.y,
        'z': pos.z,
        'timestamp': Math.floor(new Date().getTime() / 1000)
      });
    }
  };

  async onMessage(message) {
    if (message.startsWith("Welcome to 6b6t.org")) {
      this.realInterval = setInterval(() => {
        try {
          this.bot.chat(`${random(this.messages)} ${makeid(10)}`);
        } catch { }
      }, 30000)
    }
    if (message.startsWith('HeartSMP')) return;
    if (message.startsWith('p3bub')) return;
    if (['discord.gg', 'dsc.gg', 'disc0rd.gg'].some(el => message.includes(el))) return;
    let prefix = null;
    let msg = null;
    let prefixedName = null;
    let noPrefixMsg = '';
    let name = message.split(' ')[0];
    if (!this.bot.players[name] && message.split(' ')[1] != 'joined.') {
      console.log(message.split(']'))
      prefix = message.split(']')[0] + ']'
      noPrefixMsg = message.split(']')[1]
      if (noPrefixMsg != null) name = noPrefixMsg.trim().split(' ')[0];
    }
    if (prefix && this.bot.players[name]) {
      msg = message.replace(`${prefix} ${name} » `, '');
    } else {
      msg = message.replace(`${name} » `, '');
    }
    prefixedName = message.split(' » ')[0]
    let colorName = null;
    let dt = dateTime.create();
    let formatted = dt.format('Y-m-d H:M:S');
    if (this.config.highlightSettings.enabled && this.config.highlightSettings.highlightList.includes(name)) {
      colorName = chalk.rgb(255, 215, 0).bold(name)
    } else {
      colorName = chalk.cyan(name)
    }

    if ([`joined.`, `quit.`, `joined`].includes(message.split(' ')[1])) {
      let conn = msg.replace(`${name} `, '');
      console.log(`${chalk.blue.bold(`[${formatted}]`)} ${colorName} ${chalk.grey(conn)}`);

      if (msg == `${name} joined.` || msg.startsWith(`${name} joined for the first time`)) {
        await this.chat.savePlayer(name, null, null, 'joins', {
          timestamp: Math.floor(new Date().getTime() / 1000),
          message: `${name} ${conn}`
        });
        this.wsSend(JSON.stringify({
          timestamp: Math.floor(new Date().getTime() / 1000),
          name: name,
          type: 'join'
        }));
      } else if (msg == `${name} quit.`) {
        await this.chat.savePlayer(name, this.bot.players[name], null, 'leaves', {
          timestamp: Math.floor(new Date().getTime() / 1000),
          message: `${name} ${conn}`
        });
        this.wsSend(JSON.stringify({
          timestamp: Math.floor(new Date().getTime() / 1000),
          name: name,
          type: 'leave'
        }));
      }

    } else if (msg == `${name} died.` || msg.startsWith(`${name} was utterly destroyed`) || msg.startsWith(`${name} was blown apart`)) {
      if (!this.config.deathMessages.enabled) return;
      let deathColor;
      if (this.config.deathMessages.colorless) {
        deathColor = chalk.grey;
      } else {
        deathColor = chalk.red;
      }

      let death = msg.replace(`${name} `, '');
      console.log(`${chalk.blue.bold(`[${formatted}]`)} ${colorName} ${deathColor(death)}`);
      await this.chat.savePlayer(name, this.bot.players[name], null, 'deaths', {
        timestamp: Math.floor(new Date().getTime() / 1000),
        message: msg
      });
      this.wsSend(JSON.stringify({
        timestamp: Math.floor(new Date().getTime() / 1000),
        name: name,
        type: 'death'
      }));

    } else {
      if (!msg.startsWith(name)) {
        if (name in this.bot.players) {
          let link = msg.split('https://').pop().split(' ')[0];
          let newMsg = msg.replace(`https://${link}`, `${chalk.rgb(51, 102, 204).bold(`https://${link}`)}`);
          console.log(`${chalk.blue.bold(`[${formatted}]`)} ${colorName} ${chalk.grey('»')} ${chalk.white(newMsg)}`);
          await this.chat.savePlayer(name, this.bot.players[name], prefix, 'messages', {
            timestamp: Math.floor(new Date().getTime() / 1000),
            message: `${msg}`
          });
          this.wsSend(JSON.stringify({
            timestamp: Math.floor(new Date().getTime() / 1000),
            prefixedName: prefixedName,
            name: name,
            message: `${msg}`,
            type: 'message'
          }));
        }

      } else if (message.substring(name.length).startsWith(' whispers: ')) {
        let whisper = msg.replace(`${name} whispers: `, '');
        if (this.config.highlightSettings.enabled && this.config.highlightSettings.privateMessages && this.config.highlightSettings.highlightList.includes(name)) {
          console.log(`${chalk.blue.bold(`[${formatted}]`)} ${chalk.rgb(255, 215, 0).bold(name)} ${chalk.rgb(85, 254, 84).bold(`whispers to ${this.username}: ${whisper}`)}`);
        } else {
          console.log(`${chalk.blue.bold(`[${formatted}]`)} ${chalk.rgb(85, 254, 84).bold(`${name} whispers to ${this.username}: ${whisper}`)}`);
        }

        return;
      } else if (msg.startsWith('You whisper to')) {
        console.log(`${chalk.blue.bold(`[${formatted}]`)} ${chalk.rgb(85, 254, 84).bold(msg)}`);
      }
      const words = msg.split(' ');
      const remainingString = words.slice(1).join(' ');
      if (remainingString.trim().startsWith('wants to')) {
        const playerName = words[0];
        await sleep(5000)
        this.bot.chat(`/tpy ${playerName}`);
      }
    }
  };
}

const bot = new bot('kazwqi', '');