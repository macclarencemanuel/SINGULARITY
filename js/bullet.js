export class Bullet {
  constructor(x, y, dx, dy, damage, speed = 12, owner = "player", color = "yellow") {
    this.width = owner === "player" ? 44 : 26;
    this.height = owner === "player" ? 20 : 16;

    this.x = x - this.width / 2;
    this.y = y - this.height / 2;

    this.dx = dx;
    this.dy = dy;

    this.damage = damage;
    this.speed = speed;
    this.owner = owner;
    this.color = color;

    this.remove = false;

    this.angle = Math.atan2(dy, dx);

    this.image = new Image();

    if (this.owner === "player") {
      this.image.src = "assets/images/player-bullet.png";
    } else {
      this.image.src = "assets/images/enemy-bullet.png";
    }
  }

  update(worldWidth, worldHeight) {
    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;

    if (
      this.x < -60 ||
      this.y < -60 ||
      this.x > worldWidth + 60 ||
      this.y > worldHeight + 60
    ) {
      this.remove = true;
    }
  }

  draw(ctx, camera) {
    const drawX = this.x - camera.x;
    const drawY = this.y - camera.y;

    const centerX = drawX + this.width / 2;
    const centerY = drawY + this.height / 2;

    ctx.save();

    ctx.translate(centerX, centerY);

    if (this.owner === "enemy") {
      ctx.rotate(this.angle + Math.PI);
    } else {
      ctx.rotate(this.angle + Math.PI / 2);
    }

    if (this.image.complete && this.image.naturalWidth > 0) {
      ctx.drawImage(
        this.image,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Fallback if PNG is missing
      ctx.fillStyle = this.owner === "player" ? "#00f6ff" : "#ff7a2f";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.ellipse(0, 0, this.width / 4, this.height / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}