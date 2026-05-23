const sounds = {
  shoot: new Audio("assets/audio/shoot.wav"),
  click: new Audio("assets/audio/click.wav"),
  kill: new Audio("assets/audio/kill.wav"),
  yay: new Audio("assets/audio/yay.wav")
};

const music = {
  menu: new Audio("assets/audio/menu-music.mp3"),
  game: new Audio("assets/audio/game-music.mp3"),
  boss: new Audio("assets/audio/boss-music.mp3"),
  gameOver: new Audio("assets/audio/gameover.mp3")
};

const baseSoundVolumes = {
  shoot: 0.6,
  click: 0.6,
  kill: 0.7,
  yay: 0.85
};

const baseMusicVolumes = {
  menu: 0.45,
  game: 0.45,
  boss: 0.55,
  gameOver: 0.6
};

music.menu.loop = true;
music.game.loop = true;
music.boss.loop = true;
music.gameOver.loop = true;

let currentMusic = null;
let masterVolume = Number(localStorage.getItem("masterVolume"));

if (Number.isNaN(masterVolume)) {
  masterVolume = 0.5;
}

applyVolume();

export function playSound(name) {
  const sound = sounds[name];

  if (!sound) return;

  sound.currentTime = 0;
  sound.volume = (baseSoundVolumes[name] || 0.6) * masterVolume;

  sound.play().catch(() => {
    // Browser may block sound until user interaction.
  });
}

export function playMusic(name) {
  const selectedMusic = music[name];

  if (!selectedMusic) return;

  if (currentMusic === selectedMusic && !selectedMusic.paused) {
    return;
  }

  stopMusic();

  currentMusic = selectedMusic;
  currentMusic.currentTime = 0;
  currentMusic.volume = (baseMusicVolumes[name] || 0.45) * masterVolume;

  currentMusic.play().catch(() => {
    // Browser may block autoplay until user interaction.
  });
}

export function stopMusic() {
  if (!currentMusic) return;

  currentMusic.pause();
  currentMusic.currentTime = 0;
  currentMusic = null;
}

export function pauseMusic() {
  if (currentMusic) {
    currentMusic.pause();
  }
}

export function resumeMusic() {
  if (currentMusic) {
    currentMusic.play().catch(() => {});
  }
}

export function setMasterVolume(value) {
  masterVolume = Number(value);

  if (Number.isNaN(masterVolume)) {
    masterVolume = 0.5;
  }

  masterVolume = Math.max(0, Math.min(1, masterVolume));

  localStorage.setItem("masterVolume", masterVolume);
  applyVolume();
}

export function getMasterVolume() {
  return masterVolume;
}

export function initVolumeSlider() {
  const slider = document.getElementById("volumeSlider");

  if (!slider) return;

  slider.value = masterVolume;

  slider.addEventListener("input", () => {
    setMasterVolume(slider.value);
  });

  slider.addEventListener("change", () => {
    setMasterVolume(slider.value);
  });
}

function applyVolume() {
  for (let name in sounds) {
    sounds[name].volume = (baseSoundVolumes[name] || 0.6) * masterVolume;
  }

  for (let name in music) {
    music[name].volume = (baseMusicVolumes[name] || 0.45) * masterVolume;
  }
}