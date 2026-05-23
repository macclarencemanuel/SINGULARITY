import { Enemy } from "./enemy.js";
import { Loot } from "./loot.js";

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export class Room {
  constructor(worldWidth, worldHeight, enemyData, lootData) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.enemyData = enemyData;
    this.lootData = lootData;

    this.maxRooms = 10;
    this.roomNumber = 1;
    this.currentWave = 1;
    this.wavesPerRoom = 3;

    this.isBossRoom = false;
    this.isFinalRoom = false;

    this.currentDifficulty = "loop";
    this.currentModifier = {
      name: "Blackout"
    };

    this.enemies = [];
    this.loot = [];
    this.spawnMarkers = [];

    this.doorsOpen = false;
    this.shopOpen = false;
    this.roomCleared = false;
    this.waitingForNextWave = false;
    this.waitingForLootCollection = false;
    this.shopAlreadyShown = false;

    this.waveJustCleared = false;
    this.roomJustCleared = false;
    this.lootCollectionReady = false;

    this.defineZones();
    this.startRoom();
  }

  defineZones() {
    this.mainArena = {
      x: this.worldWidth * 0.035,
      y: this.worldHeight * 0.055,
      width: this.worldWidth * 0.93,
      height: this.worldHeight * 0.61
    };

    this.topCorridor = {
      x: this.worldWidth * 0.355,
      y: this.worldHeight * 0.0,
      width: this.worldWidth * 0.29,
      height: this.worldHeight * 0.20
    };

    this.bottomCorridor = {
      x: this.worldWidth * 0.355,
      y: this.worldHeight * 0.58,
      width: this.worldWidth * 0.29,
      height: this.worldHeight * 0.39
    };

    this.spawnArea = {
      x: this.worldWidth * 0.36,
      y: this.worldHeight * 0.78,
      width: this.worldWidth * 0.28,
      height: this.worldHeight * 0.17
    };

    this.topDoor = {
      x: this.worldWidth * 0.42,
      y: this.worldHeight * 0.01,
      width: this.worldWidth * 0.16,
      height: this.worldHeight * 0.07
    };

    this.walkableAreas = [
      this.mainArena,
      this.topCorridor,
      this.bottomCorridor,
      this.spawnArea
    ];

    this.obstacles = [
      {
        name: "bottom left crate",
        x: this.worldWidth * 0.29,
        y: this.worldHeight * 0.86,
        width: this.worldWidth * 0.08,
        height: this.worldHeight * 0.08
      },
      {
        name: "bottom right crate",
        x: this.worldWidth * 0.63,
        y: this.worldHeight * 0.86,
        width: this.worldWidth * 0.08,
        height: this.worldHeight * 0.08
      },
      {
        name: "top left crate",
        x: this.worldWidth * 0.29,
        y: this.worldHeight * 0.09,
        width: this.worldWidth * 0.08,
        height: this.worldHeight * 0.08
      },
      {
        name: "top right crate",
        x: this.worldWidth * 0.63,
        y: this.worldHeight * 0.09,
        width: this.worldWidth * 0.08,
        height: this.worldHeight * 0.08
      }
    ];
  }

  getPlayerSpawnPosition() {
    return {
      x: this.spawnArea.x + this.spawnArea.width / 2 - 15,
      y: this.spawnArea.y + this.spawnArea.height / 2 - 15
    };
  }

  startRoom() {
    this.currentWave = 1;

    this.enemies = [];
    this.loot = [];
    this.spawnMarkers = [];

    this.doorsOpen = false;
    this.shopOpen = false;
    this.roomCleared = false;
    this.waitingForNextWave = false;
    this.waitingForLootCollection = false;
    this.shopAlreadyShown = false;

    this.waveJustCleared = false;
    this.roomJustCleared = false;
    this.lootCollectionReady = false;

    this.isBossRoom = this.roomNumber === 5 || this.roomNumber === 10;
    this.isFinalRoom = this.roomNumber === this.maxRooms;

    if (this.isBossRoom) {
      this.wavesPerRoom = 1;
      this.currentModifier.name = this.isFinalRoom
        ? "Terminal Signal"
        : "Unknown Signal";
    } else {
      this.wavesPerRoom = 3;
      this.currentModifier.name = "Blackout";
    }

    this.spawnWave();
  }

  getDifficultyScalar() {
    return 1 + (this.roomNumber - 1) * 0.08 + (this.currentWave - 1) * 0.05;
  }

  getScaledEnemyData(type) {
    const base = this.enemyData[type];

    /*
      Difficulty scaling:
      Room 1 = very easy
      Room 5 = medium
      Room 9 = hard
      Room 10 = final boss
    */
    const roomProgress = Math.min(this.roomNumber - 1, 8) / 8;

    if (type === "charger") {
      return {
        ...base,

        // HP slowly increases
        hp: Math.round(base.hp + roomProgress * 3),

        // Speed starts slower and gets harder, but not crazy fast
        speed: base.speed * (0.65 + roomProgress * 0.35),

        // Damage only increases late game
        damage: this.roomNumber >= 8 ? 2 : 1,

        color: base.color
      };
    }

    if (type === "ranger") {
      return {
        ...base,

        hp: Math.round(base.hp + roomProgress * 2),

        speed: base.speed * (0.65 + roomProgress * 0.30),

        damage: this.roomNumber >= 8 ? 2 : 1,

        color: base.color,

        // Shoots slower in early rooms, faster later
        shotCooldown: Math.round(130 - roomProgress * 45)
      };
    }

    return base;
  }

  spawnWave() {
    this.waitingForNextWave = false;

    if (this.isBossRoom) {
      this.addBossMarker();
      return;
    }

    const totalEnemies =
      2 + this.currentWave + Math.floor((this.roomNumber - 1) * 0.8);

    const rangerCount = Math.max(
      1,
      Math.floor(totalEnemies / (this.roomNumber <= 2 ? 4 : 3))
    );

    const chargerCount = totalEnemies - rangerCount;

    this.addSpawnMarkers(
      "charger",
      chargerCount,
      this.getScaledEnemyData("charger")
    );

    this.addSpawnMarkers(
      "ranger",
      rangerCount,
      this.getScaledEnemyData("ranger")
    );
  }

  addBossMarker() {
    const x = this.mainArena.x + this.mainArena.width / 2 - 45;
    const y = this.mainArena.y + this.mainArena.height * 0.25;

    const isFinalBoss = this.roomNumber === 10;

    this.spawnMarkers.push({
      x,
      y,
      data: {
        hp: isFinalBoss ? 90 : 52,
        speed: isFinalBoss ? 1.45 : 1.15,
        damage: isFinalBoss ? 2 : 1,
        color: "#ff2d75",
        shotSpeed: isFinalBoss ? 8 : 6.6,
        shotCooldown: isFinalBoss ? 72 : 105
      },
      type: "boss",
      timer: 90
    });
  }

  addSpawnMarkers(type, count, data = null) {
    const margin = 90;

    for (let i = 0; i < count; i++) {
      const side = randomChoice(["top", "bottom", "left", "right"]);
      let x = 0;
      let y = 0;

      if (side === "top") {
        x = randomRange(
          this.mainArena.x + margin,
          this.mainArena.x + this.mainArena.width - margin
        );
        y = this.mainArena.y + margin;
      }

      if (side === "bottom") {
        x = randomRange(
          this.mainArena.x + margin,
          this.mainArena.x + this.mainArena.width - margin
        );
        y = this.mainArena.y + this.mainArena.height - margin;
      }

      if (side === "left") {
        x = this.mainArena.x + margin;
        y = randomRange(
          this.mainArena.y + margin,
          this.mainArena.y + this.mainArena.height - margin
        );
      }

      if (side === "right") {
        x = this.mainArena.x + this.mainArena.width - margin;
        y = randomRange(
          this.mainArena.y + margin,
          this.mainArena.y + this.mainArena.height - margin
        );
      }

      this.spawnMarkers.push({
        x,
        y,
        data: data || this.enemyData[type],
        type,
        timer: 55 + Math.floor(Math.random() * 20)
      });
    }
  }

  updateSpawnWarnings() {
    for (let marker of this.spawnMarkers) {
      marker.timer--;

      if (marker.timer <= 0) {
        this.enemies.push(new Enemy(marker.x, marker.y, marker.data, marker.type));
        marker.remove = true;
      }
    }

    this.spawnMarkers = this.spawnMarkers.filter((marker) => !marker.remove);
  }

  drawSpawnWarnings(ctx, camera) {
    for (let marker of this.spawnMarkers) {
      const drawX = marker.x - camera.x;
      const drawY = marker.y - camera.y;

      ctx.fillStyle =
        marker.type === "boss"
          ? "rgba(255, 45, 117, 0.3)"
          : "rgba(255, 0, 0, 0.22)";

      ctx.beginPath();
      ctx.arc(
        drawX + 15,
        drawY + 15,
        marker.type === "boss" ? 48 : 22,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = marker.type === "boss" ? "#ff2d75" : "red";
      ctx.font = marker.type === "boss" ? "34px Arial" : "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("!", drawX + 15, drawY + 22);
      ctx.textAlign = "left";
    }
  }

  checkWaveProgress() {
    if (this.enemies.length > 0) return;
    if (this.spawnMarkers.length > 0) return;
    if (this.doorsOpen) return;
    if (this.shopOpen) return;
    if (this.roomCleared) return;
    if (this.waitingForNextWave) return;

    if (this.currentWave < this.wavesPerRoom) {
      this.waveJustCleared = true;
      this.waitingForNextWave = true;

      setTimeout(() => {
        this.currentWave++;
        this.spawnWave();
      }, 1000);

      return;
    }

    this.roomCleared = true;
    this.waitingForLootCollection = true;
    this.roomJustCleared = true;
  }

  checkLootCollectionComplete() {
    if (!this.waitingForLootCollection) return false;
    if (this.shopAlreadyShown) return false;
    if (this.loot.length > 0) return false;

    this.waitingForLootCollection = false;
    this.shopOpen = true;
    this.shopAlreadyShown = true;
    this.lootCollectionReady = true;

    return true;
  }

  openDoorsAfterShop() {
    this.shopOpen = false;
    this.doorsOpen = true;
  }

  drawDoor(ctx, camera) {
    return;
  }

  checkDoorEnter(player) {
    if (!this.doorsOpen) return false;
    return this.collide(player, this.topDoor);
  }

  enterNextRoom() {
    if (this.roomNumber >= this.maxRooms) {
      return;
    }

    this.roomNumber++;
    this.startRoom();
  }

  tryDropLoot(x, y) {
    const safePoint = this.clampPointToNearestWalkableArea(x, y);

    if (this.isBossRoom) {
      const coinData = this.lootData.coin;

      for (let i = 0; i < 8; i++) {
        const offsetX = randomRange(-55, 55);
        const offsetY = randomRange(-55, 55);

        const dropPoint = this.clampPointToNearestWalkableArea(
          safePoint.x + offsetX,
          safePoint.y + offsetY
        );

        this.loot.push(new Loot(dropPoint.x, dropPoint.y, coinData));
      }

      return;
    }

    const lootKeys = Object.keys(this.lootData);

    for (let itemName of lootKeys) {
      const item = this.lootData[itemName];

      if (Math.random() < item.dropChance) {
        this.loot.push(new Loot(safePoint.x, safePoint.y, item));
        break;
      }
    }
  }

  clampPointToNearestWalkableArea(x, y) {
    let nearestArea = this.mainArena;
    let nearestDistance = Infinity;

    for (let area of this.walkableAreas) {
      const closestX = Math.max(area.x, Math.min(x, area.x + area.width));
      const closestY = Math.max(area.y, Math.min(y, area.y + area.height));

      const dx = x - closestX;
      const dy = y - closestY;
      const distance = dx * dx + dy * dy;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestArea = area;
      }
    }

    return {
      x: Math.max(
        nearestArea.x + 35,
        Math.min(x, nearestArea.x + nearestArea.width - 35)
      ),
      y: Math.max(
        nearestArea.y + 35,
        Math.min(y, nearestArea.y + nearestArea.height - 35)
      )
    };
  }

  isPlayerInWalkableArea(player) {
    return this.isEntityInWalkableArea(player);
  }

  isEntityInWalkableArea(entity) {
    const box = this.getCollisionBox(entity);

    let insideWalkable = false;

    for (let area of this.walkableAreas) {
      if (this.isFullyInside(box, area)) {
        insideWalkable = true;
        break;
      }
    }

    if (!insideWalkable) return false;

    for (let obstacle of this.obstacles) {
      if (this.collide(box, obstacle)) {
        return false;
      }
    }

    return true;
  }

  getCollisionBox(entity) {
    const shrinkX = entity.width * 0.25;
    const shrinkY = entity.height * 0.25;

    return {
      x: entity.x + shrinkX / 2,
      y: entity.y + shrinkY / 2,
      width: entity.width - shrinkX,
      height: entity.height - shrinkY
    };
  }

  isFullyInside(box, area) {
    return (
      box.x >= area.x &&
      box.y >= area.y &&
      box.x + box.width <= area.x + area.width &&
      box.y + box.height <= area.y + area.height
    );
  }

  drawWalkableDebug(ctx, camera) {
    ctx.save();

    ctx.strokeStyle = "lime";
    ctx.lineWidth = 3;

    for (let area of this.walkableAreas) {
      ctx.strokeRect(
        area.x - camera.x,
        area.y - camera.y,
        area.width,
        area.height
      );
    }

    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;

    for (let obstacle of this.obstacles) {
      ctx.strokeRect(
        obstacle.x - camera.x,
        obstacle.y - camera.y,
        obstacle.width,
        obstacle.height
      );
    }

    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      this.topDoor.x - camera.x,
      this.topDoor.y - camera.y,
      this.topDoor.width,
      this.topDoor.height
    );

    ctx.restore();
  }

  collide(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}