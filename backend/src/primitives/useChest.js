async function getItemFromChest(bot, obs, chestPosition, itemsToGet) {
  // return if chestPosition is not Vec3
  if (!(chestPosition instanceof Vec3)) {
      bot.chat("chestPosition for getItemFromChest must be a Vec3");
      return;
  }
  await moveToChest(bot, chestPosition);
  const chestBlock = bot.blockAt(chestPosition);
  const chest = await bot.openContainer(chestBlock);
  for (const name in itemsToGet) {
      const itemByName = bot.registry.itemsByName[name];
      if (!itemByName) {
          obs.chat(`No item named ${name}`);
          continue;
      }

      const item = chest.findContainerItem(itemByName.id);
      if (!item) {
          obs.chat(`I don't see ${name} in this chest`);
          continue;
      }
      try {
          await chest.withdraw(item.type, null, itemsToGet[name]);
      } catch (err) {
          obs.chat(`Not enough ${name} in chest.`);
      }
  }
  await closeChest(bot, chestBlock);
}

async function depositItemIntoChest(bot, obs, chestPosition, itemsToDeposit) {
  // return if chestPosition is not Vec3
  if (!(chestPosition instanceof Vec3)) {
      throw new Error(
          "chestPosition for depositItemIntoChest must be a Vec3"
      );
  }
  await moveToChest(bot, obs, chestPosition);
  const chestBlock = bot.blockAt(chestPosition);
  const chest = await bot.openContainer(chestBlock);
  for (const name in itemsToDeposit) {
      const itemByName = bot.registry.itemsByName[name];
      if (!itemByName) {
          obs.chat(`No item named ${name}`);
          continue;
      }
      const item = bot.inventory.findInventoryItem(itemByName.id);
      if (!item) {
          obs.chat(`No ${name} in inventory`);
          continue;
      }
      try {
          await chest.deposit(item.type, null, itemsToDeposit[name]);
      } catch (err) {
          obs.chat(`Not enough ${name} in inventory.`);
      }
  }
  await closeChest(bot, obs, chestBlock);
}

async function checkItemInsideChest(bot, obs, chestPosition) {
  // return if chestPosition is not Vec3
  if (!(chestPosition instanceof Vec3)) {
      throw new Error(
          "chestPosition for depositItemIntoChest must be a Vec3"
      );
  }
  await moveToChest(bot, obs, chestPosition);
  const chestBlock = bot.blockAt(chestPosition);
  await bot.openContainer(chestBlock);
  await closeChest(bot, obs, chestBlock);
}

async function moveToChest(bot, obs, chestPosition) {
  if (!(chestPosition instanceof Vec3)) {
      throw new Error(
          "chestPosition for depositItemIntoChest must be a Vec3"
      );
  }
  if (chestPosition.distanceTo(bot.entity.position) > 32) {
      bot.chat(
          `/tp ${chestPosition.x} ${chestPosition.y} ${chestPosition.z}`
      );
      await bot.waitForTicks(20);
  }
  const chestBlock = bot.blockAt(chestPosition);
  if (chestBlock.name !== "chest") {
      bot.emit("removeChest", chestPosition);
      throw new Error(
          `No chest at ${chestPosition}, it is ${chestBlock.name}`
      );
  }
  await bot.pathfinder.goto(
      new GoalLookAtBlock(chestBlock.position, bot.world, {})
  );
  return chestBlock;
}

async function listItemsInChest(bot, obs, chestBlock) {
  const chest = await bot.openContainer(chestBlock);
  const items = chest.containerItems();
  if (items.length > 0) {
      const itemNames = items.reduce((acc, obj) => {
          if (acc[obj.name]) {
              acc[obj.name] += obj.count;
          } else {
              acc[obj.name] = obj.count;
          }
          return acc;
      }, {});
      bot.emit("closeChest", itemNames, chestBlock.position);
  } else {
      bot.emit("closeChest", {}, chestBlock.position);
  }
  return chest;
}

async function closeChest(bot, obs, chestBlock) {
  try {
      const chest = await listItemsInChest(bot, obs, chestBlock);
      await chest.close();
  } catch (err) {
      await bot.closeWindow(chestBlock);
  }
}

function itemByName(items, name) {
  for (let i = 0; i < items.length; ++i) {
      const item = items[i];
      if (item && item.name === name) return item;
  }
  return null;
}
