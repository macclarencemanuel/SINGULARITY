export const keys = {
  up: false,
  down: false,
  left: false,
  right: false,
  run: false
};

export const mouse = {
  x: 0,
  y: 0,
  isDown: false,
  clicked: false
};

const pressedKeys = new Set();

window.addEventListener("keydown", (event) => {
  pressedKeys.add(event.code);

  keys[event.key] = true;
  keys[event.code] = true;

  updateMovementKeys(event);
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);

  keys[event.key] = false;
  keys[event.code] = false;

  updateMovementKeys(event);

  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    keys.run = false;
    keys["Shift"] = false;
    keys["ShiftLeft"] = false;
    keys["ShiftRight"] = false;

    pressedKeys.delete("ShiftLeft");
    pressedKeys.delete("ShiftRight");
  }
});

function updateMovementKeys(event) {
  keys.up = pressedKeys.has("KeyW");
  keys.down = pressedKeys.has("KeyS");
  keys.left = pressedKeys.has("KeyA");
  keys.right = pressedKeys.has("KeyD");

  /*
    Important anti-stuck fix:
    If the current event says Shift is not held,
    forcibly clear all Shift values.
  */
  if (!event.shiftKey) {
    keys.run = false;
    keys["Shift"] = false;
    keys["ShiftLeft"] = false;
    keys["ShiftRight"] = false;

    pressedKeys.delete("ShiftLeft");
    pressedKeys.delete("ShiftRight");
    return;
  }

  keys.run =
    pressedKeys.has("ShiftLeft") ||
    pressedKeys.has("ShiftRight") ||
    event.shiftKey;
}

window.addEventListener("blur", clearInput);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
  }
});

function clearInput() {
  pressedKeys.clear();

  for (let key in keys) {
    keys[key] = false;
  }

  keys.up = false;
  keys.down = false;
  keys.left = false;
  keys.right = false;
  keys.run = false;

  mouse.isDown = false;
  mouse.clicked = false;
}

window.addEventListener("mousedown", (event) => {
  if (event.button === 0) {
    mouse.isDown = true;
    mouse.clicked = true;
  }
});

window.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    mouse.isDown = false;
  }
});

export function updateMousePosition(event, canvas) {
  const rect = canvas.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  mouse.y = ((event.clientY - rect.top) / rect.height) * canvas.height;
}

export function resetMouseClick() {
  mouse.clicked = false;
}