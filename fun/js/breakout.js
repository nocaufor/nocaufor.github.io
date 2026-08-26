/* nocau Fun 打砖块：挡板反弹小球击碎砖块（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var canvas = document.getElementById("b-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("b-score");
  var livesEl = document.getElementById("b-lives");
  var levelEl = document.getElementById("b-level");
  var startBtn = document.getElementById("b-start");
  var resetBtn = document.getElementById("b-reset");

  var W = canvas.width, H = canvas.height;
  var PADDLE_W = 96, PADDLE_H = 12, BALL_R = 7;
  var BRICK_ROWS = 6, BRICK_COLS = 10;

  var state = null;
  var raf = null;
  var running = false;
  var lastTs = 0;

  var BRICK_COLORS = ["#e06c75", "#d19a66", "#e5c07b", "#98c379", "#56b6c2", "#7aa2f7"];

  function buildLevel(level) {
    var bricks = [];
    var rows = Math.min(BRICK_ROWS, 4 + level);
    var bw = (W - 40 - (BRICK_COLS - 1) * 4) / BRICK_COLS;
    var bh = 22;
    var top = 54;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < BRICK_COLS; c++) {
        // 高级关卡随机少几块
        if (level > 2 && Math.random() < 0.08) continue;
        bricks.push({
          x: 20 + c * (bw + 4),
          y: top + r * (bh + 4),
          w: bw, h: bh,
          hp: (r < 2 && level >= 3) ? 2 : 1,
          color: BRICK_COLORS[r % BRICK_COLORS.length]
        });
      }
    }
    return bricks;
  }

  function reset(level, keepScore) {
    state = {
      paddleX: (W - PADDLE_W) / 2,
      paddleY: H - 34,
      ballX: W / 2,
      ballY: H - 44,
      ballVX: 0,
      ballVY: 0,
      ballSpeed: 5.6,
      bricks: buildLevel(level),
      score: keepScore ? state.score : 0,
      lives: keepScore ? state.lives : 3,
      level: level,
      launched: false,
      over: false
    };
    if (scoreEl) scoreEl.textContent = state.score;
    if (livesEl) livesEl.textContent = state.lives;
    if (levelEl) levelEl.textContent = state.level;
  }

  function launch() {
    if (!state || state.launched || state.over) return;
    state.launched = true;
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    state.ballVX = Math.cos(angle) * state.ballSpeed;
    state.ballVY = Math.sin(angle) * state.ballSpeed;
  }

  function update(dt) {
    if (!state || !state.launched || state.over) return;
    var s = state;
    // 球随挡板（未发射时）
    if (!s.launched) {
      s.ballX = s.paddleX + PADDLE_W / 2;
      s.ballY = s.paddleY - BALL_R - 1;
      return;
    }
    s.ballX += s.ballVX * dt;
    s.ballY += s.ballVY * dt;

    // 左右墙
    if (s.ballX - BALL_R < 0) { s.ballX = BALL_R; s.ballVX = -s.ballVX; }
    if (s.ballX + BALL_R > W) { s.ballX = W - BALL_R; s.ballVX = -s.ballVX; }
    // 上墙
    if (s.ballY - BALL_R < 0) { s.ballY = BALL_R; s.ballVY = -s.ballVY; }
    // 挡板
    if (s.ballVY > 0 && s.ballY + BALL_R >= s.paddleY && s.ballY + BALL_R <= s.paddleY + PADDLE_H + 6 &&
        s.ballX >= s.paddleX - BALL_R && s.ballX <= s.paddleX + PADDLE_W + BALL_R) {
      var hit = (s.ballX - (s.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
      hit = Math.max(-1, Math.min(1, hit));
      var angle = hit * (Math.PI / 3) - Math.PI / 2;
      var speed = Math.min(s.ballSpeed * 1.02, 10);
      s.ballVX = Math.cos(angle) * speed;
      s.ballVY = Math.sin(angle) * speed;
      s.ballY = s.paddleY - BALL_R - 0.1;
    }
    // 掉底
    if (s.ballY - BALL_R > H) {
      s.lives--;
      if (livesEl) livesEl.textContent = s.lives;
      if (s.lives <= 0) {
        s.over = true;
        stop(false);
        return;
      }
      s.launched = false;
      s.ballVX = 0; s.ballVY = 0;
    }
    // 砖块碰撞
    for (var i = s.bricks.length - 1; i >= 0; i--) {
      var b = s.bricks[i];
      if (b.hp <= 0) continue;
      if (s.ballX + BALL_R > b.x && s.ballX - BALL_R < b.x + b.w &&
          s.ballY + BALL_R > b.y && s.ballY - BALL_R < b.y + b.h) {
        b.hp--;
        if (b.hp <= 0) {
          s.bricks.splice(i, 1);
          s.score += 10;
        } else {
          s.score += 2;
        }
        if (scoreEl) scoreEl.textContent = s.score;
        // 简单反弹：判断碰撞方向
        var overlapX = Math.min(s.ballX + BALL_R - b.x, b.x + b.w - (s.ballX - BALL_R));
        var overlapY = Math.min(s.ballY + BALL_R - b.y, b.y + b.h - (s.ballY - BALL_R));
        if (overlapX < overlapY) {
          s.ballVX = -s.ballVX;
        } else {
          s.ballVY = -s.ballVY;
        }
        break;
      }
    }
    // 通关
    if (s.bricks.length === 0) {
      s.over = true;
      stop(true);
      return;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!state) return;
    var s = state;
    // 砖块
    s.bricks.forEach(function (b) {
      ctx.fillStyle = b.hp > 1 ? "#d19a66" : b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,.18)";
      ctx.fillRect(b.x, b.y, b.w, 5);
    });
    // 挡板
    ctx.fillStyle = "#7aa2f7";
    roundRect(s.paddleX, s.paddleY, PADDLE_W, PADDLE_H, 6);
    ctx.fill();
    // 球
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = "#e8e8ea";
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loop(ts) {
    var dt = Math.min((ts - lastTs) / 16.7, 3);
    lastTs = ts;
    update(dt);
    draw();
    if (!state.over) {
      raf = requestAnimationFrame(loop);
    }
  }

  function start() {
    if (!state) reset(1, false);
    if (state.over) return;
    running = !running;
    if (running) {
      if (startBtn) startBtn.textContent = "暂停";
      lastTs = performance.now();
      raf = requestAnimationFrame(loop);
    } else {
      if (startBtn) startBtn.textContent = "继续";
      cancelAnimationFrame(raf);
    }
  }

  function stop(won) {
    running = false;
    cancelAnimationFrame(raf);
    if (startBtn) startBtn.textContent = "开始 / 暂停";
    draw();
    var status = document.getElementById("fx-status");
    if (status) status.textContent = won ? "🎉 通关！点击「开始」进入下一关" : "💀 生命耗尽，点击「重开」再来一次";
    if (won && !state) return;
    if (won) {
      state = null;
      setTimeout(function () { reset(state && state.level ? state.level + 1 : 1, true); }, 100);
      // 保留分数与生命并升级
      var lvl = (levelEl && parseInt(levelEl.textContent, 10) || 1) + 1;
      reset(lvl, true);
    }
  }

  canvas.addEventListener("mousemove", function (ev) {
    if (!state) return;
    var rect = canvas.getBoundingClientRect();
    var x = (ev.clientX - rect.left) * (W / rect.width);
    state.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    if (!state.launched && !state.over) {
      state.ballX = state.paddleX + PADDLE_W / 2;
    }
  });
  canvas.addEventListener("touchmove", function (ev) {
    if (!state) return;
    ev.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var t = ev.touches[0];
    var x = (t.clientX - rect.left) * (W / rect.width);
    state.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
    if (!state.launched && !state.over) {
      state.ballX = state.paddleX + PADDLE_W / 2;
    }
  }, { passive: false });
  canvas.addEventListener("click", function () { launch(); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === " ") {
      ev.preventDefault();
      if (!state) { reset(1, false); }
      if (!running && !state.over) start(); else if (running) start();
      launch();
    }
    if (ev.key === "ArrowLeft" && state) state.paddleX = Math.max(0, state.paddleX - 28);
    if (ev.key === "ArrowRight" && state) state.paddleX = Math.min(W - PADDLE_W, state.paddleX + 28);
  });

  if (startBtn) startBtn.addEventListener("click", function () { start(); });
  if (resetBtn) resetBtn.addEventListener("click", function () { cancelAnimationFrame(raf); running = false; reset(1, false); if (startBtn) startBtn.textContent = "开始 / 暂停"; draw(); });

  reset(1, false);
  draw();
})();
