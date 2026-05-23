export function updateHud(player, room) {
  const hpText = document.getElementById("hpText");
  const shieldText = document.getElementById("shieldText");
  const coinsText = document.getElementById("coinsText");
  const roomText = document.getElementById("roomText");
  const waveText = document.getElementById("waveText");

  if (hpText) {
    hpText.textContent = "HP: " + player.hp + "/" + player.maxHp;
  }

  if (shieldText) {
    shieldText.textContent = "Shield: " + player.shield;
  }

  if (coinsText) {
    coinsText.textContent = "Credits: " + player.coins;
  }

  if (roomText) {
    roomText.textContent = "Room: " + room.roomNumber;
  }

  if (waveText) {
    waveText.textContent = "Wave: " + room.currentWave;
  }
}

export function showScreen(screenId) {
  const screens = [
    "introScreen",
    "loadingScreen",
    "titleScreen",
    "mainMenu",
    "settingsScreen",
    "instructionsScreen",
    "gameCutsceneScreen",
    "gameScreen"
  ];
  for (let id of screens) {
    const screen = document.getElementById(id);

    if (screen) {
      screen.classList.add("hidden");
    }
  }

  const targetScreen = document.getElementById(screenId);

  if (targetScreen) {
    targetScreen.classList.remove("hidden");
  }
}

export function showMessage(text, duration = 1200) {
  const messageBox = document.getElementById("messageBox");

  if (!messageBox) return;

  messageBox.textContent = text;
  messageBox.classList.remove("hidden");

  setTimeout(() => {
    messageBox.classList.add("hidden");
  }, duration);
}

export function showShop() {
  const shopPanel = document.getElementById("shopPanel");

  if (shopPanel) {
    shopPanel.classList.remove("hidden");
  }
}

export function hideShop() {
  const shopPanel = document.getElementById("shopPanel");

  if (shopPanel) {
    shopPanel.classList.add("hidden");
  }
}

export function showPausePanel() {
  const pausePanel = document.getElementById("pausePanel");

  if (pausePanel) {
    pausePanel.classList.remove("hidden");
  }
}

export function hidePausePanel() {
  const pausePanel = document.getElementById("pausePanel");

  if (pausePanel) {
    pausePanel.classList.add("hidden");
  }
}

export function showGameOverPanel(roomNumber, stats = {}) {
  const gameOverPanel = document.getElementById("gameOverPanel");
  const gameOverStats = document.getElementById("gameOverStats");

  if (!gameOverPanel) return;

  const bestRoom = localStorage.getItem("bestRoom") || 0;

  const coinsCollected = stats.coinsCollected || 0;
  const enemiesDefeated = stats.enemiesDefeated || 0;
  const timeSurvived = stats.timeSurvived || "0s";

  if (gameOverStats) {
    gameOverStats.innerHTML = `
      <p><span>Room Reached</span><strong>${roomNumber}</strong></p>
      <p><span>Best Room</span><strong>${bestRoom}</strong></p>
      <p><span>Credits Collected</span><strong>${coinsCollected}</strong></p>
      <p><span>Enemies Defeated</span><strong>${enemiesDefeated}</strong></p>
      <p><span>Time Survived</span><strong>${timeSurvived}</strong></p>
    `;
  }

  const finalRoomText = document.getElementById("finalRoomText");
  const finalBestText = document.getElementById("finalBestText");
  const finalCoinsText = document.getElementById("finalCoinsText");
  const finalEnemiesText = document.getElementById("finalEnemiesText");
  const finalPowerText = document.getElementById("finalPowerText");
  const finalTimeText = document.getElementById("finalTimeText");

  if (finalRoomText) {
    finalRoomText.textContent = "Room Reached: " + roomNumber;
  }

  if (finalBestText) {
    finalBestText.textContent = "Best Room: " + bestRoom;
  }

  if (finalCoinsText) {
    finalCoinsText.textContent = "Credits Collected: " + coinsCollected;
  }

  if (finalEnemiesText) {
    finalEnemiesText.textContent = "Enemies Defeated: " + enemiesDefeated;
  }

  if (finalPowerText) {
    finalPowerText.classList.add("hidden");
  }

  if (finalTimeText) {
    finalTimeText.textContent = "Time Survived: " + timeSurvived;
  }

  gameOverPanel.classList.remove("hidden");
}

export function hideGameOverPanel() {
  const gameOverPanel = document.getElementById("gameOverPanel");

  if (gameOverPanel) {
    gameOverPanel.classList.add("hidden");
  }
}

export function updateBestRoomText() {
  const bestRoomText = document.getElementById("bestRoomText");

  if (!bestRoomText) return;

  const bestRoom = localStorage.getItem("bestRoom") || 0;
  bestRoomText.textContent = "Best Room: " + bestRoom;
}