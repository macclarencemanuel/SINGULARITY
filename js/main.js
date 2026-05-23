import { Game } from "./game.js";
import { showScreen, updateBestRoomText } from "./ui.js";
import { playMusic, playSound, initVolumeSlider } from "./audio.js";

let game = null;
let gameData = null;

let titleContinued = false;
let introFinished = false;
let gameCutsceneFinished = false;
let isTransitioning = false;

const FADE_TIME = 800;
const FADE_HOLD = 250;

async function loadJSON(path) {
  const response = await fetch(path);
  return await response.json();
}

async function init() {
  const enemyData = await loadJSON("data/enemies.json");
  const lootData = await loadJSON("data/loot.json");
  const roomData = await loadJSON("data/rooms.json");

  gameData = {
    enemyData,
    lootData,
    roomData
  };

  updateBestRoomText();
  initVolumeSlider();

  setupButtons();
  setupIntroSequence();
}

function setupButtons() {
  document.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      playSound("click");
    });
  });

  const titleScreen = document.getElementById("titleScreen");
  const playBtn = document.getElementById("playBtn");
  const startGameBtn = document.getElementById("startGameBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const exitBtn = document.getElementById("exitBtn");
  const backFromSettings = document.getElementById("backFromSettings");
  const backFromInstructions = document.getElementById("backFromInstructions");
  const skipGameIntroBtn = document.getElementById("skipGameIntroBtn");

  if (titleScreen) {
    titleScreen.addEventListener("click", continueFromTitleScreen);
  }

  document.addEventListener("keydown", () => {
    const currentTitleScreen = document.getElementById("titleScreen");

    if (currentTitleScreen && !currentTitleScreen.classList.contains("hidden")) {
      continueFromTitleScreen();
    }
  });

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      fadeTo(() => {
        document.getElementById("startGameBtn").classList.remove("hidden");
        document.getElementById("backFromInstructions").classList.remove("hidden");
        showScreen("instructionsScreen");
      });
    });
  }

  if (startGameBtn) {
    startGameBtn.addEventListener("click", () => {
      playGameIntroThenStart();
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      fadeTo(() => {
        showScreen("settingsScreen");
      });
    });
  }

  if (exitBtn) {
    exitBtn.addEventListener("click", () => {
      alert("You can close the browser tab to exit the game.");
    });
  }

  if (backFromSettings) {
    backFromSettings.addEventListener("click", () => {
      fadeTo(() => {
        showScreen("mainMenu");
        playMusic("menu");
      });
    });
  }

  if (backFromInstructions) {
    backFromInstructions.addEventListener("click", () => {
      fadeTo(() => {
        showScreen("mainMenu");
        playMusic("menu");
      });
    });
  }

  if (skipGameIntroBtn) {
    skipGameIntroBtn.addEventListener("click", () => {
      finishGameIntro();
    });
  }
}

function setupIntroSequence() {
  const introVideo = document.getElementById("introVideo");
  const fadeOverlay = document.getElementById("fadeOverlay");

  showScreen("introScreen");

  if (!introVideo) {
    fadeTo(() => {
      showScreen("titleScreen");
      playMusic("menu");
    });
    return;
  }

  introVideo.loop = false;
  introVideo.muted = true;
  introVideo.currentTime = 0;

  if (fadeOverlay) {
    fadeOverlay.classList.add("active");

    setTimeout(() => {
      fadeOverlay.classList.remove("active");
    }, 600);
  }

  introVideo.play().catch((error) => {
    console.warn("Intro autoplay was blocked:", error);
    finishIntro();
  });

  introVideo.onended = finishIntro;

  introVideo.ontimeupdate = () => {
    if (!introVideo.duration) return;

    if (introVideo.currentTime >= introVideo.duration - 0.15) {
      finishIntro();
    }
  };
}

function finishIntro() {
  if (introFinished) return;

  introFinished = true;

  const introVideo = document.getElementById("introVideo");

  if (introVideo) {
    introVideo.pause();
    introVideo.onended = null;
    introVideo.ontimeupdate = null;
  }

  fadeTo(() => {
    showScreen("titleScreen");
    playMusic("menu");
  });
}

function playGameIntroThenStart() {
  const gameIntroVideo = document.getElementById("gameCutsceneVideo");

  gameCutsceneFinished = false;

  /*
    Exact flow:
    Start Game
    → fade to black
    → switch to cutscene screen while black
    → fade clears
    → THEN video plays
  */
  fadeTo(
    () => {
      showScreen("gameCutsceneScreen");

      if (!gameIntroVideo) {
        startNewGame();
        return;
      }

      gameIntroVideo.pause();
      gameIntroVideo.loop = false;
      gameIntroVideo.muted = false;
      gameIntroVideo.currentTime = 0;
    },
    () => {
      playGameIntroVideo();
    }
  );
}

function playGameIntroVideo() {
  const gameIntroVideo = document.getElementById("gameCutsceneVideo");

  if (!gameIntroVideo) {
    startNewGame();
    return;
  }

  gameIntroVideo.onended = finishGameIntro;

  gameIntroVideo.ontimeupdate = () => {
    if (!gameIntroVideo.duration) return;

    if (gameIntroVideo.currentTime >= gameIntroVideo.duration - 0.15) {
      finishGameIntro();
    }
  };

  gameIntroVideo.play().catch((error) => {
    console.warn("Game intro failed to play:", error);
    finishGameIntro();
  });
}

function finishGameIntro() {
  if (gameCutsceneFinished) return;

  gameCutsceneFinished = true;

  const gameIntroVideo = document.getElementById("gameCutsceneVideo");

  if (gameIntroVideo) {
    gameIntroVideo.pause();
    gameIntroVideo.onended = null;
    gameIntroVideo.ontimeupdate = null;
  }

  /*
    Exact flow:
    video ends / skip clicked
    → fade to black
    → gameplay screen appears while black
    → fade clears
  */
  fadeTo(() => {
    startNewGame();
  });
}

function fadeTo(action, afterFadeOut = null) {
  if (isTransitioning) return;

  isTransitioning = true;

  const fadeOverlay = document.getElementById("fadeOverlay");

  if (!fadeOverlay) {
    action();

    if (afterFadeOut) {
      afterFadeOut();
    }

    isTransitioning = false;
    return;
  }

  fadeOverlay.classList.add("active");

  setTimeout(() => {
    try {
      action();
    } catch (error) {
      console.error("Fade transition error:", error);
    }

    setTimeout(() => {
      fadeOverlay.classList.remove("active");

      setTimeout(() => {
        isTransitioning = false;

        if (afterFadeOut) {
          afterFadeOut();
        }
      }, FADE_TIME);
    }, FADE_HOLD);
  }, FADE_TIME);
}

function continueFromTitleScreen() {
  if (titleContinued) return;

  const titleScreen = document.getElementById("titleScreen");

  if (!titleScreen || titleScreen.classList.contains("hidden")) return;

  titleContinued = true;

  playSound("click");
  playMusic("menu");

  fadeTo(() => {
    showScreen("mainMenu");
    playMusic("menu");
    titleContinued = false;
  });
}

function startNewGame() {
  const canvas = document.getElementById("gameCanvas");

  game = new Game(
    canvas,
    gameData.enemyData,
    gameData.lootData,
    gameData.roomData
  );

  showScreen("gameScreen");
  playMusic("game");
  game.start();
}

init();