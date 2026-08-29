/* mole-rush：打地鼠（纯 DOM + CSS transition，CSP 兼容） */
(function () {
  "use strict";
  var grid = document.getElementById("mr-grid");
  var timeEl = document.getElementById("mr-time");
  var scoreEl = document.getElementById("mr-score");
  var rateEl = document.getElementById("mr-rate");
  var msgEl = document.getElementById("mr-msg");
  var startBtn = document.getElementById("mr-start");

  var HOLES = 9;
  var holes = [];
  var active = null, score = 0, time = 30, hits = 0, misses = 0;
  var timer = null, spawnT = null, running = false;

  function buildGrid() {
    for (var i = 0; i < HOLES; i++) {
      var d = document.createElement("div");
      d.className = "mr-hole";
      var m = document.createElement("span");
      m.className = "mole";
      m.textContent = "🐹";
      d.appendChild(m);
      (function (idx) {
        d.addEventListener("click", function () { whack(idx); });
      })(i);
      grid.appendChild(d);
      holes.push(d);
    }
  }

  function updateHud() {
    timeEl.textContent = time;
    scoreEl.textContent = score;
    var total = hits + misses;
    rateEl.textContent = total > 0 ? Math.round(hits / total * 100) + "%" : "-";
  }

  function spawnMole() {
    if (!running || time <= 0) return;
    var i = Math.floor(Math.random() * HOLES);
    if (i === active && holes[i].classList.contains("up")) {
      // 避免连续同一洞，换一个
      i = (i + 1) % HOLES;
    }
    holes[i].classList.add("up");
    active = i;
    var dur = 800 + Math.random() * 600;
    spawnT = setTimeout(function () {
      if (active === i) {
        holes[i].classList.remove("up");
        active = null;
        misses += 1;
        updateHud();
      }
      spawnMole();
    }, dur);
  }

  function whack(i) {
    if (!running) return;
    if (active === null || i !== active) { misses += 1; updateHud(); return; }
    score += 10; hits += 1;
    clearTimeout(spawnT);
    active = null;
    holes[i].classList.remove("up");
    holes[i].classList.add("hit");
    setTimeout(function () { holes[i].classList.remove("hit"); }, 160);
    updateHud();
    spawnMole();
  }

  function end() {
    running = false;
    clearInterval(timer);
    if (spawnT) clearTimeout(spawnT);
    holes.forEach(function (h) { h.classList.remove("up"); });
    msgEl.textContent = "时间到！得分 " + score + "，命中 " + hits + " 次，命中率 " + rateEl.textContent;
    startBtn.textContent = "再来一局";
  }

  startBtn.addEventListener("click", function () {
    score = 0; hits = 0; misses = 0; time = 30; active = null;
    if (timer) clearInterval(timer);
    if (spawnT) clearTimeout(spawnT);
    holes.forEach(function (h) { h.classList.remove("up", "hit"); });
    running = true;
    msgEl.textContent = "开始！";
    startBtn.textContent = "游戏中…";
    timer = setInterval(function () {
      time -= 1;
      updateHud();
      if (time <= 0) end();
    }, 1000);
    updateHud();
    setTimeout(spawnMole, 400);
  });

  buildGrid();
  updateHud();
})();
