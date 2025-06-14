const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const reloadBtn = document.getElementById('reloadBtn');
const bgMusic = document.getElementById('bgMusic');
const musicOnBtn = document.getElementById('musicOnBtn');
const musicOffBtn = document.getElementById('musicOffBtn');
const scoreDisplay = document.getElementById('score');
const topScoreDisplay = document.getElementById('topScore');
const playButton = document.getElementById('playButton');
const btnRotate = document.getElementById('btnRotate');
const btnLeft = document.getElementById('btnLeft');
const btnDown = document.getElementById('btnDown');
const btnRight = document.getElementById('btnRight');

context.scale(20, 20);

let topScore = Number(localStorage.getItem('tetrisTopScore')) || 0;
topScoreDisplay.textContent = 'Skor Tertinggi: ' + topScore;

let musicPlaying = (localStorage.getItem('tetrisMusicPlaying') === 'false') ? false : true;

function updateMusicButtons() {
  if (musicPlaying) {
    musicOnBtn.classList.add('active');
    musicOnBtn.setAttribute('aria-selected', 'true');
    musicOffBtn.classList.remove('active');
    musicOffBtn.setAttribute('aria-selected', 'false');
  } else {
    musicOffBtn.classList.add('active');
    musicOffBtn.setAttribute('aria-selected', 'true');
    musicOnBtn.classList.remove('active');
    musicOnBtn.setAttribute('aria-selected', 'false');
  }
}

function playMusic() {
  bgMusic.play().catch(() => {});
  musicPlaying = true;
  updateMusicButtons();
  localStorage.setItem('tetrisMusicPlaying', 'true');
}

function pauseMusic() {
  bgMusic.pause();
  musicPlaying = false;
  updateMusicButtons();
  localStorage.setItem('tetrisMusicPlaying', 'false');
}

musicOnBtn.addEventListener('click', () => {
  if (!musicPlaying) {
    playMusic();
  }
});

musicOffBtn.addEventListener('click', () => {
  if (musicPlaying) {
    pauseMusic();
  }
});

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;
let gameStarted = false;

const colors = [
  null,
  '#FF0D72',
  '#0DC2FF',
  '#0DFF72',
  '#F538FF',
  '#FF8E0D',
  '#FFE138',
  '#3877FF',
];

const arena = [];
for(let i = 0; i < 20; i++) {
  arena.push(new Array(12).fill(0));
}

const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
};

function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function createPiece(type) {
  if (type === 'T') {
    return [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];
  } else if (type === 'O') {
    return [
      [2, 2],
      [2, 2],
    ];
  } else if (type === 'L') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [0, 3, 3],
    ];
  } else if (type === 'J') {
    return [
      [0, 4, 0],
      [0, 4, 0],
      [4, 4, 0],
    ];
  } else if (type === 'I') {
    return [
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
      [0, 5, 0, 0],
    ];
  } else if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === 'Z') {
    return [
      [7, 7, 0],
      [0, 7, 7],
      [0, 0, 0],
    ];
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, { x: 0, y: 0 });
  drawMatrix(player.matrix, player.pos);
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerReset() {
  const pieces = 'ILJOTSZ';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    gameOverOverlay.classList.add('show');
    animationId = null;
    gameStarted = false;
    setControlsEnabled(false);
    playButton.style.display = 'none';
    pauseMusic();
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function arenaSweep() {
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;
    player.score += 10;
    if (player.score > topScore) {
      topScore = player.score;
      localStorage.setItem('tetrisTopScore', topScore);
      topScoreDisplay.textContent = 'Skor Tertinggi: ' + topScore;
    }
    updateScoreDisplay();
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = 'Skor: ' + player.score;
}

function setControlsEnabled(enabled) {
  btnRotate.disabled = !enabled;
  btnLeft.disabled = !enabled;
  btnDown.disabled = !enabled;
  btnRight.disabled = !enabled;
}

document.addEventListener('keydown', event => {
  if (!gameStarted) return;
  if (event.keyCode === 37) {
    playerMove(-1);
  } else if (event.keyCode === 39) {
    playerMove(1);
  } else if (event.keyCode === 40) {
    playerDrop();
  } else if (event.keyCode === 81) {
    playerRotate(-1);
  } else if (event.keyCode === 87) {
    playerRotate(1);
  }
});

reloadBtn.addEventListener('click', () => {
  resetGame();
});

function resetGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  gameOverOverlay.classList.remove('show');
  arena.length = 0;
  for (let i = 0; i < 20; i++) {
    arena.push(new Array(12).fill(0));
  }
  player.score = 0;
  updateScoreDisplay();
  playerReset();
  lastTime = 0;
  dropCounter = 0;
  gameStarted = true;
  setControlsEnabled(true);
  playMusic();
  animationId = requestAnimationFrame(update);
  playButton.style.display = 'none';
}

btnRotate.addEventListener('click', () => {
  if (gameStarted) {
    playerRotate(1);
  }
});
btnLeft.addEventListener('click', () => {
  if (gameStarted) playerMove(-1);
});
btnRight.addEventListener('click', () => {
  if (gameStarted) playerMove(1);
});
btnDown.addEventListener('click', () => {
  if (gameStarted) playerDrop();
});

playButton.addEventListener('click', () => {
  playButton.style.display = 'none';
  gameStarted = true;
  resetGame();
});

function update(time = 0) {
  if (!gameStarted) return;
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  animationId = requestAnimationFrame(update);
}

updateScoreDisplay();
setControlsEnabled(false);
updateMusicButtons();

