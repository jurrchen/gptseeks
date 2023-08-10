/* eslint-disable @typescript-eslint/no-var-requires */
import * as mineflayer from 'mineflayer';
import { mineflayer as mineflayerViewer } from 'prismarine-viewer';
import * as inventoryViewer from 'mineflayer-web-inventory';
import { PubSub } from 'graphql-subscriptions';
import { Message } from '../common/message.model';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { MessagesService } from 'src/relay/messages.service';
import { ConfigService } from '@nestjs/config';
import * as babel from '@babel/core';
import * as fs from 'fs';
import Observer from 'src/common/obs.model';
import { goals } from 'mineflayer-pathfinder';
import { BOT_USERNAME } from '../common/types';

export function getEntities(bot) {
  const entities = bot.entities;
  if (!entities) return {};
  // keep all monsters in one list, keep other mobs in another list
  const mobs = {};
  for (const id in entities) {
    const entity = entities[id];
    if (!entity.displayName) continue;
    if (entity.name === 'player' || entity.name === 'item') continue;
    if (entity.position.distanceTo(bot.entity.position) < 32) {
      if (!mobs[entity.name]) {
        mobs[entity.name] = entity.position.distanceTo(bot.entity.position);
      } else if (
        mobs[entity.name] > entity.position.distanceTo(bot.entity.position)
      ) {
        mobs[entity.name] = entity.position.distanceTo(bot.entity.position);
      }
    }
  }
  return mobs;
}

export function getEquipment(bot) {
  const slots = bot.inventory.slots;
  const mainHand = bot.heldItem;
  return slots
    .slice(5, 9)
    .concat(mainHand, slots[45])
    .map((item) => (item ? item.name : 'empty'));
}

export function getSurroundingBlocks(bot, x_distance, y_distance, z_distance) {
  const surroundingBlocks = new Set();

  for (let x = -x_distance; x <= x_distance; x++) {
    for (let y = -y_distance; y <= y_distance; y++) {
      for (let z = -z_distance; z <= z_distance; z++) {
        const block = bot.blockAt(bot.entity.position.offset(x, y, z));
        if (block && block.type !== 0) {
          surroundingBlocks.add(block.name);
        }
      }
    }
  }
  // console.log(surroundingBlocks);
  return surroundingBlocks;
}

// Needs to remember chests
export function getChests(bot) {
  const chests = bot.findBlocks({
    matching: bot.registry.blocksByName.chest.id,
    maxDistance: 16,
    count: 999,
  });
  chests.forEach((chest) => {
    if (!this.chestsItems.hasOwnProperty(chest)) {
      this.chestsItems[chest] = 'Unknown';
    }
  });
  return this.chestsItems;
}

export function getTime(bot) {
  const timeOfDay = bot.time.timeOfDay;
  let time = '(unknown)';
  if (timeOfDay < 1000) {
    time = 'sunrise';
  } else if (timeOfDay < 6000) {
    time = 'day';
  } else if (timeOfDay < 12000) {
    time = 'noon';
  } else if (timeOfDay < 13000) {
    time = 'sunset';
  } else if (timeOfDay < 18000) {
    time = 'night';
  } else if (timeOfDay < 22000) {
    time = 'midnight';
  } else {
    time = 'sunrise';
  }

  return time;
}

function getFunctionName(code: string) {
  const parsed = babel.parse(code).program.body;
  return (parsed.reverse()[0] as any).id.name;
}

const CRAFT_HELPER = fs.readFileSync(
  './src/primitives/craftHelper.js',
  'utf-8',
);
const CRAFT_ITEM = fs.readFileSync('./src/primitives/craftItem.js', 'utf-8');
const EXPLORE_UNTIL = fs.readFileSync(
  './src/primitives/exploreUntil.js',
  'utf-8',
);
const KILL_MOB = fs.readFileSync('./src/primitives/killMob.js', 'utf-8');
const MINE_BLOCK = fs.readFileSync('./src/primitives/mineBlock.js', 'utf-8');
const PLACE_ITEM = fs.readFileSync('./src/primitives/placeItem.js', 'utf-8');
const SHOOT = fs.readFileSync('./src/primitives/shoot.js', 'utf-8');
const SMELT_ITEM = fs.readFileSync('./src/primitives/smeltItem.js', 'utf-8');
const USE_CHEST = fs.readFileSync('./src/primitives/useChest.js', 'utf-8');
const WAIT_FOR_MOB_REMOVED = fs.readFileSync(
  './src/primitives/waitForMobRemoved.js',
  'utf-8',
);

@Injectable()
export class BotService implements OnModuleDestroy {
  private bot: mineflayer.Bot;

  constructor(private readonly messageService: MessagesService) {
    const bot = mineflayer.createBot({
      host: 'localhost',
      port: 25565,
      username: BOT_USERNAME,
      accessToken: '123',
    });
    this.bot = bot;

    bot.once('spawn', async () => {
      const { pathfinder } = require('mineflayer-pathfinder');
      const tool = require('mineflayer-tool').plugin;
      const collectBlock = require('../collectblock').plugin;
      const pvp = require('mineflayer-pvp').plugin;
      const minecraftHawkEye = require('minecrafthawkeye');
      bot.loadPlugin(pathfinder);
      bot.loadPlugin(tool);
      bot.loadPlugin(collectBlock);
      bot.loadPlugin(pvp);
      bot.loadPlugin(minecraftHawkEye);

      inventoryViewer(bot, {
        port: 3006,
      });

      mineflayerViewer(bot, {
        port: 3007,
      });
    });
  }

  async registerChat(f: (username: string, message: string) => Promise<void>) {
    this.bot.on('chat', f);
  }

  async leash() {
    const jurchenPosition = this.bot.players['jurchen']?.entity?.position;
    if (!jurchenPosition) {
      this.bot.chat('I cant see you');
      return;
    }
    const goal = jurchenPosition;
    this.bot.chat('going to ' + goal.x + ' ' + goal.y + ' ' + goal.z);
    this.bot.pathfinder.setGoal(new goals.GoalNear(goal.x, goal.y, goal.z, 1));
    return;
  }

  async runCode(code: string) {
    console.warn(code);
    const bot = this.bot;

    const obs = new Observer(this.messageService);
    const functionName = getFunctionName(code);
    const program = `
    const { goals } = require('mineflayer-pathfinder');
    const { GoalPlaceBlock, GoalNear, GoalNearXZ, GoalXZ, GoalGetToBlock, GoalFollow, GoalLookAtBlock } = goals;
    const { Vec3 } = require('vec3');
  
    ${CRAFT_HELPER}
    ${CRAFT_ITEM}
    ${EXPLORE_UNTIL}
    ${KILL_MOB}
    ${MINE_BLOCK}
    ${PLACE_ITEM}
    ${SHOOT}
    ${SMELT_ITEM}
    ${USE_CHEST}
    ${WAIT_FOR_MOB_REMOVED}
  
    let _mineBlockFailCount = 0;
    let _placeItemFailCount = 0;
    let _craftItemFailCount = 0;
    let _killMobFailCount = 0;
    let _smeltItemFailCount = 0;
  
    ${code}
  
    ${functionName}(bot, obs);
    `;

    try {
      await eval(program);
    } catch (e) {
      console.warn('CAUGHT ERROR');
      console.warn(e);
      obs.setError(e);
      return e;
    }
    // if (e) {
    //   return {
    //     success: false,
    //     critique: `Error: ${e.name} ${e.message}`,
    //     code,
    //     attemptId,
    //   };
    // }
  }

  getBasicObservations() {
    const bot = this.bot;
    const inventoryUsed = bot.inventory.slots.filter((slot) => slot).length;
    const inventory = bot.inventory
      .items()
      .map((item) => `${item.name}:${item.count}`)
      .join(', ');
    const biome = bot.blockAt(bot.entity.position)?.biome?.name || 'Unknown';
    const time = getTime(bot);
    const equipment = getEquipment(bot).join(', ');
    const entities = getEntities(bot); // TODO: figure out mapping dict
    const blocks = [...getSurroundingBlocks(bot, 8, 2, 8)];
    const craftingTable = bot.findBlock({
      matching: bot.registry.blocksByName.crafting_table.id,
      maxDistance: 32,
    });
    const furnace = bot.findBlock({
      matching: bot.registry.blocksByName.furnace.id,
      maxDistance: 32,
    });
    const craftingTablePos = craftingTable
      ? `x=${craftingTable.position.x}, y=${craftingTable.position.y}, z=${craftingTable.position.z}`
      : '(None)';
    const furnacePos = furnace
      ? `x=${furnace.position.x}, y=${furnace.position.y}, z=${furnace.position.z}`
      : '(None)';

    const { x, y, z } = bot.entity.position;
    const observations = `Biome: ${biome}
Time: ${time}
Nearby blocks: ${blocks}
Nearby entities (nearest to farthest): ${JSON.stringify(entities)}
Nearby crafting table: ${craftingTablePos}
Nearby furnace: ${furnacePos}
Health: ${bot.health}/20
Hunger: ${bot.food}/20
Position: x=${x}, y=${y}, z=${z}
Inventory (${inventoryUsed}/36): ${inventory}
Equipment: ${equipment}
Chests: (Unknown)`;
    return observations;
  }

  onModuleDestroy() {
    console.warn('CLOSE');
    this.bot.end('close');
  }
}
