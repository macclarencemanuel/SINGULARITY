const lootImages = {
  coin: new Image(),
  heal: new Image()
};

lootImages.coin.src = "assets/images/credit.png";
lootImages.heal.src = "assets/images/heal.png";

export class Loot {
  constructor(x, y, data) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 28;
    this.type = data.type;
    this.value = data.value;
    this.color = data.color;
    this.remove = false;
  }

  apply(player) {
    if (this.type === "heal") {
      player.heal(this.value);
    }

    if (this.type === "coin") {
      player.coins += this.value;
    }

    if (this.type === "power") {
      player.power += this.value;
    }

    if (this.type === "shield") {
      player.shield += this.value;
    }

    this.remove = true;
  }

  draw(ctx, camera) {
    const drawX = this.x - camera.x;
    const drawY = this.y - camera.y;

    let image = null;

    if (this.type === "coin") {
      image = lootImages.coin;
    }

    if (this.type === "heal") {
      image = lootImages.heal;
    }

    if (image && image.complete && image.naturalWidth > 0) {
      ctx.drawImage(
        image,
        drawX,
        drawY,
        this.width,
        this.height
      );
    } else {
      ctx.fillStyle = this.color;
      ctx.fillRect(drawX, drawY, this.width, this.height);

      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(drawX, drawY, this.width, this.height);
    }
  }
}