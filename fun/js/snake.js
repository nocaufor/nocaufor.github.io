/* 贪吃蛇小游戏 */
(function () {
  "use strict";
  var canvas = document.getElementById("snake-canvas");
  var overlay = document.getElementById("snake-overlay");
  var scoreText = document.getElementById("snake-score-text");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var COLS = 20, ROWS = 20, CELL;
  var snake, dir, nextDir, food, score, running, timer;

  function resize() {
    var size = Math.min(420, canvas.parentElement.clientWidth - 8);
    CELL = size / COLS;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = size + "px"; canvas.style.height = size + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function reset() {
    snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    dir = { x: 1, y: 0 }; nextDir = dir;
    score = 0; running = false;
    placeFood();
    draw();
    if (scoreText) scoreText.textContent = "得分 " + score;
  }
  function placeFood() {
    do { food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 }; }
    while (snake.some(function (s) { return s.x === food.x && s.y === food.y; }));
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    // 网格
    ctx.strokeStyle = "rgba(140,150,160,0.12)";
    ctx.lineWidth = 0.6;
    for (var i = 1; i < COLS; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, ROWS * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(COLS * CELL, i * CELL); ctx.stroke();
    }
    // 食物
    ctx.fillStyle = "#e07b54";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2);
    ctx.fill();
    // 蛇
    snake.forEach(function (s, k) {
      ctx.fillStyle = k === 0 ? "#8fa8bd" : "#6f8fa8";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 3) : ctx.rect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      ctx.fill();
    });
  }
  function step() {
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    var hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    var hitSelf = snake.some(function (s) { return s.x === head.x && s.y === head.y; });
    if (hitWall || hitSelf) { gameOver(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; if (scoreText) scoreText.textContent = "得分 " + score; placeFood(); }
    else snake.pop();
    draw();
  }
  function gameOver() {
    running = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (overlay) overlay.style.display = "flex";
    if (scoreText) scoreText.textContent = "游戏结束，得分 " + score;
    var start = document.getElementById("snake-start");
    if (start) start.textContent = "再来一局";
  }
  function start() {
    reset();
    if (overlay) overlay.style.display = "none";
    running = true;
    if (timer) clearInterval(timer);
    timer = setInterval(step, 110);
  }
  document.addEventListener("keydown", function (e) {
    if (!running) return;
    var k = e.key.toLowerCase();
    if (k === "arrowup" || k === "w") { if (dir.y !== 1) nextDir = { x: 0, y: -1 }; e.preventDefault(); }
    else if (k === "arrowdown" || k === "s") { if (dir.y !== -1) nextDir = { x: 0, y: 1 }; e.preventDefault(); }
    else if (k === "arrowleft" || k === "a") { if (dir.x !== 1) nextDir = { x: -1, y: 0 }; e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { if (dir.x !== -1) nextDir = { x: 1, y: 0 }; e.preventDefault(); }
  });
  var startBtn = document.getElementById("snake-start");
  if (startBtn) startBtn.addEventListener("click", start);
  reset();
})();
