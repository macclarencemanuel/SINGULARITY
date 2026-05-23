import { keys } from "./input.js";

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 72;
    this.height = 72;

    this.speed = 3.2;
    this.runMultiplier = 1.45;

    this.hp = 5;
    this.maxHp = 5;
    this.coins = 0;
    this.power = 1;
    this.shield = 0;

    this.gun = {
      name: "Blaster"
    };

    this.shootCooldown = 0;
    this.invincibleTimer = 0;

    this.aimAngle = 0;

    this.walkFrames = [];
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameSpeed = 8;
    this.isMoving = false;
    this.isRunning = false;

    this.loadSprites();
  }

  loadSprites() {
    for (let i = 1; i <= 5; i++) {
      const img = new Image();
      img.src = `assets/images/player-walk-${i}.png`;
      this.walkFrames.push(img);
    }
  }

  update(worldWidth, worldHeight) {
    let moveX = 0;
    let moveY = 0;

    if (keys.up) moveY -= 1;
    if (keys.down) moveY += 1;
    if (keys.left) moveX -= 1;
    if (keys.right) moveX += 1;

    const length = Math.sqrt(moveX * moveX + moveY * moveY);

    if (length > 0) {
      moveX /= length;
      moveY /= length;
      this.isMoving = true;
    } else {
      this.isMoving = false;
    }

    /*
      Shift only works while actually held.
      If Shift gets stuck in old key values, this ignores them.
    */
    this.isRunning = keys.run === true && this.isMoving;

    const currentSpeed = this.isRunning
      ? this.speed * this.runMultiplier
      : this.speed;

    this.x += moveX * currentSpeed;
    this.y += moveY * currentSpeed;

    this.x = Math.max(0, Math.min(worldWidth - this.width, this.x));
    this.y = Math.max(0, Math.min(worldHeight - this.height, this.y));

    this.updateAnimation();

    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.invincibleTimer > 0) this.invincibleTimer--;
  }

  updateAnimation() {
    if (!this.isMoving) {
      this.currentFrame = 0;
      return;
    }

    this.frameTimer++;

    const animationSpeed = this.isRunning ? 5 : this.frameSpeed;

    if (this.frameTimer >= animationSpeed) {
      this.frameTimer = 0;
      this.currentFrame++;

      if (this.currentFrame >= this.walkFrames.length) {
        this.currentFrame = 0;
      }
    }
  }

  setAimAngle(angle) {
    this.aimAngle = angle;
  }

  canShoot() {
    return this.shootCooldown <= 0;
  }

  draw(ctx, camera) {
    const drawX = this.x - camera.x;
    const drawY = this.y - camera.y;

    const centerX = drawX + this.width / 2;
    const centerY = drawY + this.height / 2;

    const sprite = this.walkFrames[this.currentFrame];

    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.rotate(this.aimAngle - Math.PI / 2);

    if (
      this.invincibleTimer > 0 &&
      Math.floor(this.invincibleTimer / 5) % 2 === 0
    ) {
      ctx.globalAlpha = 0.5;
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
      ctx.fillStyle = "#4bd8ff";
      ctx.beginPath();
      ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.shield > 0) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, this.width / 2 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  fullHeal() {
    this.hp = this.maxHp;
  }

  increaseMaxHp() {
    this.maxHp += 1;
    this.hp = this.maxHp;
  }

  increasePower() {
    this.power += 1;
  }

  increaseSpeed() {
    this.speed += 0.25;
  }

  addShield() {
    this.shield += 1;
  }

  takeDamage(amount) {
    if (this.invincibleTimer > 0) return;

    if (this.shield > 0) {
      this.shield -= 1;
      this.invincibleTimer = 60;
      return;
    }

    this.hp -= amount;
    this.invincibleTimer = 60;
  }
}