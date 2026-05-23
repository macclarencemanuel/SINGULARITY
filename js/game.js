import { playSound, playMusic } from "./audio.js";
import { Player } from "./player.js";
import { Bullet } from "./bullet.js";
import { Room } from "./room.js";
import { keys, mouse, updateMousePosition, resetMouseClick } from "./input.js";
import { rectsCollide } from "./utils.js";
// if your file is util.js instead of utils.js, change the line above

import {
  updateHud,
  showScreen,
  showMessage,
  showShop,
  hideShop,
  showPausePanel,
  hidePausePanel,
  showGameOverPanel,
  hideGameOverPanel,
  updateBestRoomText
} from "./ui.js";

export class Game {
  constructor(canvas, enemyData, lootData, roomData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.enemyData = enemyData;
    this.lootData = lootData;
    this.roomData = roomData;

    this.baseMapWidth = 1080;
    this.baseMapHeight = 1920;
    this.worldScale = 1.25;

    this.worldWidth = this.baseMapWidth * this.worldScale;
    this.worldHeight = this.baseMapHeight * this.worldScale;

    this.mapImage = new Image();
    this.mapImage.src = "assets/images/map.png";

    this.hamsterImage = new Image();
    this.hamsterImage.src = "assets/images/hamster-ending.png";

    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.25,
      width: this.canvas.width / 1.25,
      height: this.canvas.height / 1.25
    };

    this.room = new Room(
      this.worldWidth,
      this.worldHeight,
      this.enemyData,
      this.lootData
    );

    const spawn = this.room.getPlayerSpawnPosition();
    this.player = new Player(spawn.x, spawn.y);
    this.player.fireDelay = this.player.fireDelay || 28;

    this.bullets = [];
    this.enemyBullets = [];
    this.muzzleFlashes = [];
    this.bloodParticles = [];
    this.impactSparks = [];

    this.running = false;
    this.paused = false;
    this.escPressed = false;
    this.shopKeyPressed = false;
    this.isDoorTransitioning = false;
    this.gameOverTriggered = false;

    this.countdownTimer = 180;
    this.dialogueTimer = null;
    this.bossWarningTimer = 0;
    this.shopPromptReady = false;

    this.endingActive = false;
    this.endingPhase = null;
    this.endingTimeouts = [];

    this.stats = {
      coinsCollected: 0,
      enemiesDefeated: 0,
      startTime: Date.now()
    };

    this.canvas.addEventListener("mousemove", (event) => {
      updateMousePosition(event, this.canvas);
    });

    this.canvas.addEventListener("mousedown", (event) => {
      updateMousePosition(event, this.canvas);
    });

    this.setupShopButtons();
    this.setupPauseButtons();
    this.setupGameOverButtons();
  }

  start() {
    this.running = true;
    this.paused = false;
    this.gameOverTriggered = false;
    this.endingActive = false;
    this.endingPhase = null;
    this.clearEndingTimeouts();
    this.countdownTimer = 180;
    this.stats.startTime = Date.now();
    this.updateCamera();
    this.loop();
  }

  restart() {
    this.room = new Room(
      this.worldWidth,
      this.worldHeight,
      this.enemyData,
      this.lootData
    );

    const spawn = this.room.getPlayerSpawnPosition();
    this.player = new Player(spawn.x, spawn.y);
    this.player.fireDelay = 28;

    this.bullets = [];
    this.enemyBullets = [];
    this.muzzleFlashes = [];
    this.bloodParticles = [];
    this.impactSparks = [];

    this.running = true;
    this.paused = false;
    this.escPressed = false;
    this.shopKeyPressed = false;
    this.isDoorTransitioning = false;
    this.gameOverTriggered = false;
    this.shopPromptReady = false;
    this.bossWarningTimer = 0;
    this.countdownTimer = 180;
    this.endingActive = false;
    this.endingPhase = null;
    this.clearEndingTimeouts();

    this.stats = {
      coinsCollected: 0,
      enemiesDefeated: 0,
      startTime: Date.now()
    };

    this.room.shopOpen = false;

    hideShop();
    hidePausePanel();
    hideGameOverPanel();
    this.hideDialogue();

    playMusic("game");

    this.updateCamera();
    this.loop();
  }

  loop() {
    if (!this.running) return;

    if (!this.paused) {
      this.update();
      this.draw();
    }

    requestAnimationFrame(() => this.loop());
  }

  update() {
    this.handlePauseInput();

    if (this.paused) return;

    if (this.endingActive) {
      resetMouseClick();
      return;
    }

    this.handleShopOpenInput();
    this.updateVisualEffects();

    if (this.room.shopOpen) {
      updateHud(this.player, this.room);
      resetMouseClick();
      return;
    }

    if (this.countdownTimer > 0) {
      this.countdownTimer--;
      updateHud(this.player, this.room);
      resetMouseClick();
      return;
    }

    const previousPlayerX = this.player.x;
    const previousPlayerY = this.player.y;

    this.player.update(this.worldWidth, this.worldHeight);

    if (!this.room.isPlayerInWalkableArea(this.player)) {
      this.player.x = previousPlayerX;
      this.player.y = previousPlayerY;
    }

    this.updateCamera();
    this.updatePlayerAim();
    this.handleShooting();

    this.room.updateSpawnWarnings();

    for (let bullet of this.bullets) {
      bullet.update(this.worldWidth, this.worldHeight);
    }

    for (let bullet of this.enemyBullets) {
      bullet.update(this.worldWidth, this.worldHeight);
    }

    for (let flash of this.muzzleFlashes) {
      flash.life--;
    }

    this.muzzleFlashes = this.muzzleFlashes.filter((flash) => flash.life > 0);

    this.updateBloodParticles();

    for (let enemy of this.room.enemies) {
      const previousEnemyX = enemy.x;
      const previousEnemyY = enemy.y;

      const shots = enemy.update(this.player);

      if (!this.room.isEntityInWalkableArea(enemy)) {
        enemy.x = previousEnemyX;
        enemy.y = previousEnemyY;
      }

      for (let shot of shots) {
        const enemyBullet = new Bullet(
          shot.x,
          shot.y,
          shot.dx,
          shot.dy,
          shot.damage,
          shot.speed,
          "enemy",
          "#ff9248"
        );

        if (shot.size === "big") {
          enemyBullet.width = 44;
          enemyBullet.height = 28;
          enemyBullet.x = shot.x - enemyBullet.width / 2;
          enemyBullet.y = shot.y - enemyBullet.height / 2;
        }

        this.enemyBullets.push(enemyBullet);
      }
    }

    this.checkBulletEnemyCollisions();
    this.checkEnemyBulletPlayerCollisions();
    this.checkEnemyPlayerCollisions();
    this.checkLootPickup();
    this.checkRoomDoor();

    this.bullets = this.bullets.filter((bullet) => !bullet.remove);
    this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.remove);
    this.room.enemies = this.room.enemies.filter((enemy) => !enemy.remove);
    this.room.loot = this.room.loot.filter((item) => !item.remove);

    this.room.checkWaveProgress();
    this.room.checkLootCollectionComplete();
    this.handleClearMessages();

    if (this.player.hp <= 0 && !this.gameOverTriggered) {
      this.gameOver();
    }

    resetMouseClick();
    updateHud(this.player, this.room);
  }

  updateCamera() {
    this.camera.width = this.canvas.width / this.camera.zoom;
    this.camera.height = this.canvas.height / this.camera.zoom;

    this.camera.x =
      this.player.x + this.player.width / 2 - this.camera.width / 2;

    this.camera.y =
      this.player.y + this.player.height / 2 - this.camera.height / 2;

    this.camera.x = Math.max(
      0,
      Math.min(this.worldWidth - this.camera.width, this.camera.x)
    );

    this.camera.y = Math.max(
      0,
      Math.min(this.worldHeight - this.camera.height, this.camera.y)
    );
  }

  handlePauseInput() {
    if (keys["Escape"] && !this.escPressed && !this.endingActive) {
      this.escPressed = true;
      this.togglePause();
    }

    if (!keys["Escape"]) {
      this.escPressed = false;
    }
  }

  handleShopOpenInput() {
    const tPressed = keys["t"] || keys["T"];

    if (tPressed && !this.shopKeyPressed) {
      this.shopKeyPressed = true;

      if (this.shopPromptReady && !this.room.shopOpen) {
        this.room.shopOpen = true;
        this.shopPromptReady = false;
        showShop();
        playSound("click");
      }
    }

    if (!tPressed) {
      this.shopKeyPressed = false;
    }
  }

  togglePause() {
    if (!this.running) return;

    this.paused = !this.paused;

    if (this.paused) {
      showPausePanel();
    } else {
      hidePausePanel();
    }
  }

  updatePlayerAim() {
    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const worldMouseX = mouse.x / this.camera.zoom + this.camera.x;
    const worldMouseY = mouse.y / this.camera.zoom + this.camera.y;

    const dx = worldMouseX - playerCenterX;
    const dy = worldMouseY - playerCenterY;

    this.player.setAimAngle(Math.atan2(dy, dx));
  }

  handleShooting() {
    if (this.room.shopOpen) return;
    if (this.room.doorsOpen) return;
    if (!mouse.clicked) return;
    if (!this.player.canShoot()) return;

    const playerCenterX = this.player.x + this.player.width / 2;
    const playerCenterY = this.player.y + this.player.height / 2;

    const worldMouseX = mouse.x / this.camera.zoom + this.camera.x;
    const worldMouseY = mouse.y / this.camera.zoom + this.camera.y;

    let dx = worldMouseX - playerCenterX;
    let dy = worldMouseY - playerCenterY;

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    dx /= length;
    dy /= length;

    this.bullets.push(
      new Bullet(
        playerCenterX,
        playerCenterY,
        dx,
        dy,
        2 + this.player.power - 1,
        13,
        "player",
        "#7ef9ff"
      )
    );

    this.muzzleFlashes.push({
      x: playerCenterX,
      y: playerCenterY,
      dx,
      dy,
      life: 8,
      maxLife: 8
    });

    playSound("shoot");
    this.player.shootCooldown = this.player.fireDelay || 28;
  }

  checkBulletEnemyCollisions() {
    for (let bullet of this.bullets) {
      for (let enemy of this.room.enemies) {
        if (rectsCollide(bullet, enemy)) {
          enemy.takeDamage(bullet.damage);
          bullet.remove = true;

          this.spawnImpactSparks(
            bullet.x + bullet.width / 2,
            bullet.y + bullet.height / 2,
            "#8ff7ff"
          );

          if (enemy.remove) {
            this.stats.enemiesDefeated++;
            this.room.tryDropLoot(enemy.x, enemy.y);
            playSound("kill");
          }

          break;
        }
      }
    }
  }

  checkEnemyBulletPlayerCollisions() {
    for (let bullet of this.enemyBullets) {
      if (rectsCollide(bullet, this.player)) {
        const oldHp = this.player.hp;
        const oldShield = this.player.shield;

        this.player.takeDamage(bullet.damage);
        bullet.remove = true;

        this.spawnImpactSparks(
          bullet.x + bullet.width / 2,
          bullet.y + bullet.height / 2,
          "#ffb37a"
        );

        if (this.player.hp < oldHp || this.player.shield < oldShield) {
          this.spawnBloodParticles(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
          );
        }
      }
    }
  }

  checkEnemyPlayerCollisions() {
    for (let enemy of this.room.enemies) {
      if (rectsCollide(enemy, this.player) && enemy.hitCooldown <= 0) {
        const oldHp = this.player.hp;
        const oldShield = this.player.shield;

        this.player.takeDamage(enemy.damage);
        enemy.hitCooldown = 60;

        if (this.player.hp < oldHp || this.player.shield < oldShield) {
          this.spawnBloodParticles(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height / 2
          );
        }
      }
    }
  }

  checkLootPickup() {
    for (let item of this.room.loot) {
      const pickupBox = {
        x: item.x - 28,
        y: item.y - 28,
        width: item.width + 56,
        height: item.height + 56
      };

      if (rectsCollide(pickupBox, this.player)) {
        if (item.type === "coin") {
          this.stats.coinsCollected += item.value;
        }

        item.apply(this.player);
      }
    }
  }

  checkRoomDoor() {
    if (this.isDoorTransitioning) return;
    if (!this.room.checkDoorEnter(this.player)) return;

    this.isDoorTransitioning = true;

    if (this.room.roomNumber >= this.room.maxRooms) {
      this.fadeTo(() => {
        this.startEndingSequence();
        this.isDoorTransitioning = false;
      });
      return;
    }

    this.fadeTo(() => {
      this.room.enterNextRoom();

      const spawn = this.room.getPlayerSpawnPosition();
      this.player.x = spawn.x;
      this.player.y = spawn.y;

      this.bullets = [];
      this.enemyBullets = [];
      this.muzzleFlashes = [];
      this.impactSparks = [];

      this.updateCamera();

      if (this.room.isBossRoom) {
        this.bossWarningTimer = 150;
        playMusic("boss");
        this.showDialogue("What the hell is that...", 3000);
      } else {
        playMusic("game");
        showMessage("Room " + this.room.roomNumber, 1000);
      }

      this.isDoorTransitioning = false;
    });
  }

  startEndingSequence() {
    if (this.endingActive) return;

    this.endingActive = true;
    this.endingPhase = "goofy";
    this.bullets = [];
    this.enemyBullets = [];
    this.muzzleFlashes = [];
    this.impactSparks = [];
    hideShop();
    hidePausePanel();
    this.hideDialogue();

    playSound("yay");

    const toSerious = setTimeout(() => {
      this.fadeTo(() => {
        this.endingPhase = "serious";
      });
    }, 2400);

    const toMenu = setTimeout(() => {
      this.fadeTo(() => {
        this.running = false;
        this.endingActive = false;
        this.endingPhase = null;
        updateBestRoomText();
        showScreen("mainMenu");
        playMusic("menu");
      });
    }, 5200);

    this.endingTimeouts.push(toSerious, toMenu);
  }

  clearEndingTimeouts() {
    for (let timeoutId of this.endingTimeouts) {
      clearTimeout(timeoutId);
    }

    this.endingTimeouts = [];
  }

  handleClearMessages() {
    if (this.room.waveJustCleared) {
      this.room.waveJustCleared = false;
      showMessage("Wave Cleared!", 900);
    }

    if (this.room.roomJustCleared) {
      this.room.roomJustCleared = false;

      if (this.room.isFinalRoom) {
        showMessage("Final threat neutralized. Collect all loot.", 1600);
      } else if (this.room.isBossRoom) {
        showMessage("Threat neutralized. Collect all loot.", 1500);
      } else {
        showMessage("Room Cleared! Collect all loot.", 1500);
      }
    }

    if (this.room.lootCollectionReady) {
      this.room.lootCollectionReady = false;
      this.room.shopOpen = false;
      this.shopPromptReady = true;

      hideShop();
      showMessage("Press T to open shop", 1200);
    }
  }

  setupShopButtons() {
    const setClick = (id, callback) => {
      const button = document.getElementById(id);
      if (button) button.onclick = callback;
    };

    const setLabel = (id, text) => {
      const button = document.getElementById(id);
      if (button) button.textContent = text;
    };

    setLabel("buyHpBtn", "Space Helmet Upgrade - +1 HP (5 Credits)");
    setLabel("buyHealBtn", "Repair - +1 Heal (4 Credits)");
    setLabel("buyPowerBtn", "Space Gloves Upgrade - +1 ATK Speed (7 Credits)");
    setLabel("buySpeedBtn", "Space Boots Upgrade - +1 Speed (6 Credits)");
    setLabel("buyShieldBtn", "Space Suit Upgrade - +1 Shield (8 Credits)");

    setClick("buyHpBtn", () => {
      if (this.player.coins >= 5) {
        this.player.coins -= 5;
        this.player.increaseMaxHp();
        updateHud(this.player, this.room);
      } else {
        showMessage("Not enough credits!", 800);
      }
    });

    setClick("buyHealBtn", () => {
      if (this.player.coins >= 4) {
        this.player.coins -= 4;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 1);
        updateHud(this.player, this.room);
      } else {
        showMessage("Not enough credits!", 800);
      }
    });

    setClick("buyPowerBtn", () => {
      if (this.player.coins >= 7) {
        this.player.coins -= 7;
        this.player.fireDelay = Math.max(10, (this.player.fireDelay || 28) - 3);
        showMessage("Attack speed increased!", 800);
        updateHud(this.player, this.room);
      } else {
        showMessage("Not enough credits!", 800);
      }
    });

    setClick("buySpeedBtn", () => {
      if (this.player.coins >= 6) {
        this.player.coins -= 6;
        this.player.increaseSpeed();
        updateHud(this.player, this.room);
      } else {
        showMessage("Not enough credits!", 800);
      }
    });

    setClick("buyShieldBtn", () => {
      if (this.player.coins >= 8) {
        this.player.coins -= 8;
        this.player.addShield();
        updateHud(this.player, this.room);
      } else {
        showMessage("Not enough credits!", 800);
      }
    });

    setClick("closeShopBtn", () => {
      hideShop();

      this.room.shopOpen = false;
      this.shopPromptReady = false;
      this.room.openDoorsAfterShop();

      if (this.room.isFinalRoom) {
        showMessage("Escape!", 1200);
      } else if (this.room.isBossRoom) {
        showMessage("Exit unlocked. Leave this place.", 1200);
      } else {
        showMessage("Exit unlocked. Head to the top door!", 1200);
      }
    });
  }

  setupPauseButtons() {
    document.getElementById("resumeBtn").onclick = () => {
      this.paused = false;
      hidePausePanel();
    };

    document.getElementById("restartBtn").onclick = () => {
      this.running = false;
      hidePausePanel();
      hideShop();
      hideGameOverPanel();
      this.hideDialogue();
      this.clearEndingTimeouts();

      this.fadeTo(() => {
        this.restart();
      });
    };

    document.getElementById("mainMenuBtn").onclick = () => {
      this.running = false;
      this.paused = false;
      this.clearEndingTimeouts();

      hidePausePanel();
      hideShop();
      hideGameOverPanel();
      this.hideDialogue();

      this.fadeTo(() => {
        updateBestRoomText();
        showScreen("mainMenu");
        playMusic("menu");
      });
    };
  }

  setupGameOverButtons() {
    const restartBtn = document.getElementById("gameOverRestartBtn");
    const menuBtn = document.getElementById("gameOverMenuBtn");

    if (restartBtn) {
      restartBtn.textContent = "Restart";
      restartBtn.onclick = () => {
        this.running = false;
        this.hideDialogue();
        hideGameOverPanel();
        this.clearEndingTimeouts();

        this.fadeTo(() => {
          this.restart();
        });
      };
    }

    if (menuBtn) {
      menuBtn.textContent = "Quit";
      menuBtn.onclick = () => {
        this.running = false;
        this.hideDialogue();
        this.clearEndingTimeouts();

        this.fadeTo(() => {
          hideGameOverPanel();
          updateBestRoomText();
          showScreen("mainMenu");
          playMusic("menu");
        });
      };
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.scale(this.camera.zoom, this.camera.zoom);

    this.drawBackground();

    for (let item of this.room.loot) {
      item.draw(this.ctx, this.camera);
    }

    for (let enemy of this.room.enemies) {
      enemy.draw(this.ctx, this.camera);
    }

    this.room.drawSpawnWarnings(this.ctx, this.camera);
    this.room.drawDoor(this.ctx, this.camera);

    this.drawLightingOverlay();
    this.drawBloodParticles();

    this.player.draw(this.ctx, this.camera);
    this.drawMuzzleFlashes();

    for (let bullet of this.bullets) {
      bullet.draw(this.ctx, this.camera);
    }

    for (let bullet of this.enemyBullets) {
      bullet.draw(this.ctx, this.camera);
    }

    this.drawImpactSparks();

    this.ctx.restore();

    if (this.room.doorsOpen) {
      this.drawExitIndicator();
    }

    if (this.shopPromptReady && !this.room.shopOpen) {
      this.drawShopHint();
    }

    if (this.countdownTimer > 0) {
      this.drawCountdown();
    }

    this.drawLowHpVignette();
    this.drawBossWarningOverlay();

    if (this.endingActive) {
      this.drawEndingOverlay();
    }
  }

  fadeTo(action) {
    const fadeOverlay = document.getElementById("fadeOverlay");

    if (!fadeOverlay) {
      action();
      return;
    }

    fadeOverlay.classList.add("active");

    setTimeout(() => {
      try {
        action();
      } catch (error) {
        console.error("Game fade transition error:", error);
      }

      setTimeout(() => {
        fadeOverlay.classList.remove("active");
      }, 300);
    }, 800);
  }

  showDialogue(text, duration = 3000) {
    const dialogueBox = document.getElementById("dialogueBox");
    const dialogueText = document.getElementById("dialogueText");

    if (!dialogueBox || !dialogueText) return;

    dialogueText.textContent = text;
    dialogueBox.classList.remove("hidden");

    clearTimeout(this.dialogueTimer);

    this.dialogueTimer = setTimeout(() => {
      dialogueBox.classList.add("hidden");
    }, duration);
  }

  hideDialogue() {
    const dialogueBox = document.getElementById("dialogueBox");

    if (dialogueBox) {
      dialogueBox.classList.add("hidden");
    }

    clearTimeout(this.dialogueTimer);
  }

  drawBackground() {
    if (this.mapImage.complete && this.mapImage.naturalWidth > 0) {
      this.ctx.drawImage(
        this.mapImage,
        -this.camera.x,
        -this.camera.y,
        this.worldWidth,
        this.worldHeight
      );
    } else {
      this.ctx.fillStyle = "#111";
      this.ctx.fillRect(0, 0, this.camera.width, this.camera.height);
    }
  }

  drawMuzzleFlashes() {
    for (let flash of this.muzzleFlashes) {
      const screenX = flash.x - this.camera.x;
      const screenY = flash.y - this.camera.y;

      const progress = flash.life / flash.maxLife;

      const flashLength = 90 * progress;
      const flashWidth = 20 * progress;

      const tipX = screenX + flash.dx * flashLength;
      const tipY = screenY + flash.dy * flashLength;

      const sideX = -flash.dy;
      const sideY = flash.dx;

      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";

      this.ctx.fillStyle = `rgba(0, 246, 255, ${0.85 * progress})`;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, screenY);
      this.ctx.lineTo(
        tipX + sideX * flashWidth,
        tipY + sideY * flashWidth
      );
      this.ctx.lineTo(
        tipX - sideX * flashWidth,
        tipY - sideY * flashWidth
      );
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = `rgba(255, 255, 255, ${1 * progress})`;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 12 * progress, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  spawnBloodParticles(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;

      this.bloodParticles.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        life: 35,
        maxLife: 35
      });
    }
  }

  updateBloodParticles() {
    for (let particle of this.bloodParticles) {
      particle.x += particle.dx;
      particle.y += particle.dy;

      particle.dx *= 0.92;
      particle.dy *= 0.92;

      particle.life--;
    }

    this.bloodParticles = this.bloodParticles.filter(
      (particle) => particle.life > 0
    );
  }

  drawBloodParticles() {
    for (let particle of this.bloodParticles) {
      const screenX = particle.x - this.camera.x;
      const screenY = particle.y - this.camera.y;

      const alpha = particle.life / particle.maxLife;

      this.ctx.save();
      this.ctx.fillStyle = `rgba(0, 255, 180, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  spawnImpactSparks(x, y, color = "#ffd37a") {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;

      this.impactSparks.push({
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        life: 12 + Math.floor(Math.random() * 6),
        maxLife: 18,
        radius: 1 + Math.random() * 2.5,
        color
      });
    }
  }

  updateVisualEffects() {
    if (this.bossWarningTimer > 0) {
      this.bossWarningTimer--;
    }

    for (let spark of this.impactSparks) {
      spark.x += spark.dx;
      spark.y += spark.dy;

      spark.dx *= 0.88;
      spark.dy *= 0.88;

      spark.life--;
    }

    this.impactSparks = this.impactSparks.filter((spark) => spark.life > 0);
  }

  drawImpactSparks() {
    for (let spark of this.impactSparks) {
      const screenX = spark.x - this.camera.x;
      const screenY = spark.y - this.camera.y;

      const alpha = spark.life / spark.maxLife;

      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";
      this.ctx.fillStyle = this.hexToRgba(spark.color, alpha);

      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, spark.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  drawLightingOverlay() {
    const playerScreenX =
      this.player.x - this.camera.x + this.player.width / 2;

    const playerScreenY =
      this.player.y - this.camera.y + this.player.height / 2;

    const viewDistance = 560;
    const coneAngle = Math.PI / 3.1;
    const aimAngle = this.player.aimAngle;

    const leftAngle = aimAngle - coneAngle / 2;
    const rightAngle = aimAngle + coneAngle / 2;

    const leftX = playerScreenX + Math.cos(leftAngle) * viewDistance;
    const leftY = playerScreenY + Math.sin(leftAngle) * viewDistance;

    const rightX = playerScreenX + Math.cos(rightAngle) * viewDistance;
    const rightY = playerScreenY + Math.sin(rightAngle) * viewDistance;

    const darknessCanvas = document.createElement("canvas");
    darknessCanvas.width = this.camera.width;
    darknessCanvas.height = this.camera.height;

    const darknessCtx = darknessCanvas.getContext("2d");

    darknessCtx.fillStyle = "rgba(0, 0, 0, 0.62)";
    darknessCtx.fillRect(0, 0, darknessCanvas.width, darknessCanvas.height);

    darknessCtx.save();
    darknessCtx.globalCompositeOperation = "destination-out";

    darknessCtx.beginPath();
    darknessCtx.moveTo(playerScreenX, playerScreenY);
    darknessCtx.lineTo(leftX, leftY);
    darknessCtx.arc(
      playerScreenX,
      playerScreenY,
      viewDistance,
      leftAngle,
      rightAngle
    );
    darknessCtx.lineTo(playerScreenX, playerScreenY);
    darknessCtx.closePath();

    const coneFade = darknessCtx.createRadialGradient(
      playerScreenX,
      playerScreenY,
      20,
      playerScreenX,
      playerScreenY,
      viewDistance
    );

    coneFade.addColorStop(0, "rgba(0, 0, 0, 1)");
    coneFade.addColorStop(0.45, "rgba(0, 0, 0, 0.95)");
    coneFade.addColorStop(0.8, "rgba(0, 0, 0, 0.55)");
    coneFade.addColorStop(1, "rgba(0, 0, 0, 0)");

    darknessCtx.fillStyle = coneFade;
    darknessCtx.fill();

    darknessCtx.restore();

    this.ctx.drawImage(darknessCanvas, 0, 0);
  }

  drawExitIndicator() {
    this.ctx.save();

    this.ctx.textAlign = "center";

    const pulse = 0.85 + Math.sin(Date.now() * 0.008) * 0.15;
    const boxWidth = 360;
    const boxHeight = 42;
    const boxX = this.canvas.width / 2 - boxWidth / 2;
    const boxY = 18;

    this.ctx.globalAlpha = pulse;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = this.room.isFinalRoom ? "#ffdf7a" : "white";
    this.ctx.font = "22px PixelFont, Arial, sans-serif";
    this.ctx.fillText(
      this.room.isFinalRoom ? "↑ ESCAPE" : "↑ GO TO NEXT ROOM",
      this.canvas.width / 2,
      boxY + 29
    );

    this.ctx.restore();
  }

  drawCountdown() {
    let text = "3";

    if (this.countdownTimer <= 120 && this.countdownTimer > 60) {
      text = "2";
    }

    if (this.countdownTimer <= 60 && this.countdownTimer > 20) {
      text = "1";
    }

    if (this.countdownTimer <= 20) {
      text = "Survive!";
    }

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = "white";
    this.ctx.font = "56px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.textAlign = "left";
  }

  drawShopHint() {
    const pulse = 0.65 + Math.sin(Date.now() * 0.01) * 0.35;

    this.ctx.save();
    this.ctx.globalAlpha = pulse;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
    this.ctx.fillRect(this.canvas.width / 2 - 210, 68, 420, 42);

    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = "#7ef9ff";
    this.ctx.font = "20px PixelFont, Arial, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText("PRESS T TO OPEN SHOP", this.canvas.width / 2, 96);
    this.ctx.textAlign = "left";

    this.ctx.restore();
  }

  drawLowHpVignette() {
    const hpRatio =
      this.player.maxHp > 0 ? this.player.hp / this.player.maxHp : 1;

    if (hpRatio > 0.35) return;

    const intensity = (0.35 - hpRatio) / 0.35;

    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.min(this.canvas.width, this.canvas.height) * 0.15,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.7
    );

    gradient.addColorStop(0, "rgba(255, 0, 0, 0)");
    gradient.addColorStop(0.65, `rgba(120, 0, 0, ${0.08 + intensity * 0.10})`);
    gradient.addColorStop(1, `rgba(180, 0, 0, ${0.22 + intensity * 0.25})`);

    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  drawBossWarningOverlay() {
    if (this.bossWarningTimer <= 0) return;

    const progress = this.bossWarningTimer / 150;
    const alpha = progress > 0.5 ? 1 : progress * 2;

    this.ctx.save();

    this.ctx.globalAlpha = alpha * 0.95;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#ff3c3c";
    this.ctx.font = "22px PixelFont, Arial, sans-serif";
    this.ctx.fillText(
      "WARNING",
      this.canvas.width / 2,
      this.canvas.height / 2 - 34
    );

    this.ctx.font = "34px PixelFont, Arial, sans-serif";
    this.ctx.fillText(
      "UNKNOWN ENTITY DETECTED",
      this.canvas.width / 2,
      this.canvas.height / 2 + 12
    );

    this.ctx.restore();
  }

  drawEndingOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.82)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.textAlign = "center";

    if (this.endingPhase === "goofy") {
      const imageSize = 220;
      const imageY = this.canvas.height / 2 - 170;

      if (this.hamsterImage.complete && this.hamsterImage.naturalWidth > 0) {
        this.ctx.drawImage(
          this.hamsterImage,
          this.canvas.width / 2 - imageSize / 2,
          imageY,
          imageSize,
          imageSize
        );
      } else {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(this.canvas.width / 2 - 90, imageY + 20, 180, 180);
      }

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "28px PixelFont, Arial, sans-serif";
      this.ctx.fillText(
        "you finished the gaem, congratulationizmification",
        this.canvas.width / 2,
        this.canvas.height / 2 + 120
      );
    }

    if (this.endingPhase === "serious") {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "42px PixelFont, Arial, sans-serif";
      this.ctx.fillText(
        "YOU COMPLETED SINGULARITY",
        this.canvas.width / 2,
        this.canvas.height / 2 - 10
      );

      this.ctx.font = "24px PixelFont, Arial, sans-serif";
      this.ctx.fillText(
        "we hope you enjoyed",
        this.canvas.width / 2,
        this.canvas.height / 2 + 42
      );
    }

    this.ctx.restore();
  }

  hexToRgba(hex, alpha) {
    const value = hex.replace("#", "");
    const full =
      value.length === 3
        ? value
            .split("")
            .map((c) => c + c)
            .join("")
        : value;

    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  saveHighScore() {
    const currentBest = Number(localStorage.getItem("bestRoom") || 0);

    if (this.room.roomNumber > currentBest) {
      localStorage.setItem("bestRoom", this.room.roomNumber);
    }
  }

  getTimeSurvived() {
    const seconds = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes <= 0) {
      return remainingSeconds + "s";
    }

    return minutes + "m " + remainingSeconds + "s";
  }

  gameOver() {
    if (this.gameOverTriggered) return;

    this.gameOverTriggered = true;
    this.paused = true;

    hideShop();
    hidePausePanel();
    this.hideDialogue();

    this.saveHighScore();
    updateBestRoomText();

    const finalRoom = this.room.roomNumber;
    const finalStats = {
      coinsCollected: this.stats.coinsCollected,
      enemiesDefeated: this.stats.enemiesDefeated,
      timeSurvived: this.getTimeSurvived()
    };

    this.fadeTo(() => {
      this.running = false;
      this.paused = false;
      showGameOverPanel(finalRoom, finalStats);
      playMusic("gameOver");
    });
  }
}