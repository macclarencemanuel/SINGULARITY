const rangerBossImage = new Image();
rangerBossImage.src = "assets/images/player-walk-1.png";

export class Enemy {
  constructor(x, y, data, type = "charger") {
    this.x = x;
    this.y = y;

    this.width = 52;
    this.height = 52;

    this.type = type;

    if (this.type === "boss") {
      this.width = 90;
      this.height = 90;
    }

    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.damage = data.damage;
    this.color = data.color;

    this.hitCooldown = 0;
    this.hitFlashTimer = 0;
    this.shootCooldown = 80 + Math.floor(Math.random() * 40);

    this.remove = false;

    this.aimAngle = 0;

    this.walkFrames = [];
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameSpeed = 8;
    this.isMoving = false;

    if (this.type === "charger") {
      this.loadChargerSprites();
    }
  }

  loadChargerSprites() {
    for (let i = 1; i <= 5; i++) {
      const img = new Image();
      img.src = `assets/images/charger-walk-${i}.png`;
      this.walkFrames.push(img);
    }
  }

  updateAnimation() {
    if (this.type !== "charger") return;

    if (!this.isMoving) {
      this.currentFrame = 0;
      return;
    }

    this.frameTimer++;

    if (this.frameTimer >= this.frameSpeed) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= this.walkFrames.length) {
        this.currentFrame = 0;
      }
    }
  }

  update(player) {
    const spawnedShots = [];

    const enemyCenterX = this.x + this.width / 2;
    const enemyCenterY = this.y + this.height / 2;

    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    let dx = playerCenterX - enemyCenterX;
    let dy = playerCenterY - enemyCenterY;

    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    dx /= dist;
    dy /= dist;

    this.aimAngle = Math.atan2(dy, dx);
    this.isMoving = false;

    if (this.type === "charger") {
      this.x += dx * this.speed;
      this.y += dy * this.speed;
      this.isMoving = true;
    }

    if (this.type === "ranger") {
      const minRange = 190;
      const maxRange = 320;

      if (dist < minRange) {
        this.x -= dx * this.speed;
        this.y -= dy * this.speed;
        this.isMoving = true;
      } else if (dist > maxRange) {
        this.x += dx * this.speed * 0.8;
        this.y += dy * this.speed * 0.8;
        this.isMoving = true;
      } else {
        const sideX = -dy;
        const sideY = dx;

        this.x += sideX * this.speed * 0.45;
        this.y += sideY * this.speed * 0.45;
        this.isMoving = true;
      }

      this.shootCooldown--;

      if (this.shootCooldown <= 0 && dist < 430) {
        spawnedShots.push({
          x: enemyCenterX,
          y: enemyCenterY,
          dx,
          dy,
          damage: 1,
          speed: 6
        });

        this.shootCooldown = 95 + Math.floor(Math.random() * 25);
      }
    }

    if (this.type === "boss") {
      const minRange = 180;
      const maxRange = 340;

      if (dist < minRange) {
        this.x -= dx * this.speed;
        this.y -= dy * this.speed;
        this.isMoving = true;
      } else if (dist > maxRange) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        this.isMoving = true;
      } else {
        const sideX = -dy;
        const sideY = dx;

        this.x += sideX * this.speed * 0.5;
        this.y += sideY * this.speed * 0.5;
        this.isMoving = true;
      }

      this.shootCooldown--;

      if (this.shootCooldown <= 0 && dist < 650) {
        spawnedShots.push({
          x: enemyCenterX,
          y: enemyCenterY,
          dx,
          dy,
          damage: 2,
          speed: 7,
          size: "big"
        });

        this.shootCooldown = 75;
      }
    }

    this.updateAnimation();

    if (this.hitCooldown > 0) {
      this.hitCooldown--;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
    }

    return spawnedShots;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlashTimer = 6;

    if (this.hp <= 0) {
      this.remove = true;
    }
  }

  draw(ctx, camera) {
    const drawX = this.x - camera.x;
    const drawY = this.y - camera.y;

    if (this.type === "charger") {
      this.drawCharger(ctx, drawX, drawY);
      return;
    }

    if (this.type === "ranger" || this.type === "boss") {
      this.drawRangerBossSprite(ctx, drawX, drawY);
    }

    if (this.type === "boss") {
      this.drawBossHealthBar(ctx, drawX, drawY);

      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("???", drawX + this.width / 2, drawY - 16);
      ctx.textAlign = "left";
    }
  }

  drawCharger(ctx, drawX, drawY) {
    const centerX = drawX + this.width / 2;
    const centerY = drawY + this.height / 2;
    const sprite = this.walkFrames[this.currentFrame];

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.aimAngle - Math.PI / 2);

    if (
      this.hitFlashTimer > 0 &&
      Math.floor(this.hitFlashTimer / 2) % 2 === 0
    ) {
      ctx.globalAlpha = 0.6;
    }

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(
        sprite,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.hitFlashTimer > 0 ? "white" : "#ff4d4d";
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawRangerBossSprite(ctx, drawX, drawY) {
    const centerX = drawX + this.width / 2;
    const centerY = drawY + this.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.aimAngle - Math.PI / 2);

    if (
      this.hitFlashTimer > 0 &&
      Math.floor(this.hitFlashTimer / 2) % 2 === 0
    ) {
      ctx.globalAlpha = 0.6;
    }

    if (rangerBossImage.complete && rangerBossImage.naturalWidth > 0) {
      ctx.drawImage(
        rangerBossImage,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.type === "boss" ? "#ff2d75" : "#b86bff";
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.strokeStyle = this.type === "boss" ? "#ff2d75" : "#b86bff";
    ctx.lineWidth = this.type === "boss" ? 3 : 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, this.width / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawBossHealthBar(ctx, drawX, drawY) {
    const barWidth = 100;
    const barHeight = 8;
    const barX = drawX + this.width / 2 - barWidth / 2;
    const barY = drawY - 34;

    const hpPercent = Math.max(0, this.hp / this.maxHp);

    ctx.fillStyle = "black";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "#ff2d75";
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}