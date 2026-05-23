export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}