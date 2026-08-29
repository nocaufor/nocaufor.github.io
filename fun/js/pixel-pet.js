/* pixel-pet：像素电子宠物（Canvas，CSP 兼容） */
(function () {
  "use strict";
  var canvas = document.getElementById("pp-canvas");
  var ctx = canvas.getContext("2d");
  var fullEl = document.getElementById("pp-full");
  var happyEl = document.getElementById("pp-happy");
  var energyEl = document.getElementById("pp-energy");
  var statusEl = document.getElementById("pp-status");
  var feedBtn = document.getElementById("pp-feed");
  var playBtn = document.getElementById("pp-play");
  var sleepBtn = document.getElementById("pp-sleep");

  var pet = { full: 78, happy: 62, energy: 70, sleeping: false, blink: 0 };
  var last = performance.now();

  function clamp(v) { return Math.max(0, Math.min(100, v)); }

  // 像素精灵：0=空 1=身体/轮廓 2=亮色 3=腮红/细节
  var SPRITE = [
    "0001111100000",
    "0012222210000",
    "0122222221000",
    "0112222221100",
    "0132211223100",
    "0132111123100",
    "0112222221100",
    "0013333331000",
    "0001111110000",
    "0001100110000",
    "0001100110000"
  ];

  function drawPet(face) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth || 560, H = canvas.clientHeight || 300;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var cell = Math.floor(Math.min(W * 0.62 / SPRITE[0].length, H * 0.72 / SPRITE.length));
    var px = Math.floor((W - SPRITE[0].length * cell) / 2);
    var py = Math.floor((H - SPRITE.length * cell) / 2 + 4);

    var colBody = "#6fb3a8", colBodyDark = "#4d8d84", colBlush = "#f7768e";
    if (pet.sleeping) { colBody = "#5d6f8f"; colBodyDark = "#465570"; }
    if (pet.full < 25 || pet.happy < 25) { colBody = "#8a6d5f"; }

    for (var y = 0; y < SPRITE.length; y++) {
      for (var x = 0; x < SPRITE[y].length; x++) {
        var c = SPRITE[y][x];
        if (c === "0") continue;
        if (c === "2") ctx.fillStyle = colBody;
        else if (c === "3") ctx.fillStyle = colBodyDark;
        else ctx.fillStyle = colBody;
        if (c === "3" && (y === 7) && (x === 2 || x === 10)) ctx.fillStyle = colBlush;
        // 眼睛（第5/6行，第3/9列）按 face 状态绘制
        if ((y === 5 || y === 6) && (x === 3 || x === 9)) {
          if (face === "sleep") { ctx.fillStyle = "#e8e8ea"; }
          else if (face === "sad") { ctx.fillStyle = "#2c3138"; }
          else { ctx.fillStyle = "#0d0f12"; }
        }
        ctx.fillRect(px + x * cell, py + y * cell, cell, cell);
      }
    }
    // 睡眠 Zzz
    if (pet.sleeping) {
      ctx.fillStyle = "#7aa2f7";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("Z", px + SPRITE[0].length * cell + 6, py + 14);
      ctx.fillText("z", px + SPRITE[0].length * cell + 18, py + 30);
    }
  }

  function faceByState() {
    if (pet.sleeping) return "sleep";
    if (pet.full < 25 || pet.happy < 25) return "sad";
    if (pet.full > 75 && pet.happy > 70) return "happy";
    return "normal";
  }

  function updateBars() {
    fullEl.style.width = pet.full + "%";
    happyEl.style.width = pet.happy + "%";
    energyEl.style.width = pet.energy + "%";
    var mood = pet.sleeping ? "睡得很香…"
      : (pet.full < 25 ? "好饿呀…" : pet.happy < 30 ? "想玩一会儿…" : "状态不错！");
    statusEl.textContent = mood;
  }

  function tick(now) {
    var dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (pet.sleeping) {
      pet.energy = clamp(pet.energy + dt * 2.4);
      pet.full = clamp(pet.full - dt * 0.1);
    } else {
      pet.full = clamp(pet.full - dt * 0.5);
      pet.happy = clamp(pet.happy - dt * 0.3);
      pet.energy = clamp(pet.energy - dt * 0.4);
    }
    updateBars();
    drawPet(faceByState());
    requestAnimationFrame(tick);
  }

  feedBtn.addEventListener("click", function () {
    pet.full = clamp(pet.full + 22);
    pet.sleeping = false;
    statusEl.textContent = "咔嚓咔嚓… 真好吃！";
  });
  playBtn.addEventListener("click", function () {
    pet.happy = clamp(pet.happy + 24);
    pet.energy = clamp(pet.energy - 10);
    pet.sleeping = false;
    statusEl.textContent = "蹦蹦跳跳真开心！";
  });
  sleepBtn.addEventListener("click", function () {
    pet.sleeping = !pet.sleeping;
    statusEl.textContent = pet.sleeping ? "呼噜呼噜…" : "醒来了！";
  });

  requestAnimationFrame(tick);
})();
