/* nocau Fun 2048：方向键合并数字（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var boardEl = document.getElementById("g-board");
  var scoreEl = document.getElementById("g-score-val");
  var bestEl = document.getElementById("g-best-val");
  var newBtn = document.getElementById("g-new");
  if (!boardEl) return;

  var SIZE = 4;
  var grid = [];
  var score = 0;
  var best = 0;
  var over = false;
  var won = false;

  try { best = parseInt(localStorage.getItem("nc2048best") || "0", 10) || 0; } catch (e) { best = 0; }
  if (bestEl) bestEl.textContent = best;

  function emptyGrid() {
    var g = [];
    for (var r = 0; r < SIZE; r++) {
      g.push([0, 0, 0, 0]);
    }
    return g;
  }

  function addTile() {
    var empty = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) empty.push([r, c]);
      }
    }
    if (!empty.length) return;
    var pick = empty[Math.floor(Math.random() * empty.length)];
    grid[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
  }

  function newGame() {
    grid = emptyGrid();
    score = 0;
    over = false;
    won = false;
    addTile();
    addTile();
    render();
    if (scoreEl) scoreEl.textContent = "0";
  }

  function render() {
    boardEl.innerHTML = "";
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var val = grid[r][c];
        var div = document.createElement("div");
        div.className = "g-cell" + (val ? " t" + val : "");
        div.style.left = "calc(" + (c * (100 / 4)) + "% + " + (c * 10 + 10) + "px)";
        div.style.top = "calc(" + (r * (100 / 4)) + "% + " + (r * 10 + 10) + "px)";
        div.style.width = "calc((100% - 50px)/4)";
        div.style.height = "calc((100% - 50px)/4)";
        if (val) div.textContent = val;
        boardEl.appendChild(div);
      }
    }
  }

  function slideLine(line) {
    // 去零
    var arr = line.filter(function (v) { return v !== 0; });
    var out = [];
    var gain = 0;
    for (var i = 0; i < arr.length; i++) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        out.push(arr[i] * 2);
        gain += arr[i] * 2;
        if (arr[i] * 2 === 2048) won = true;
        i++;
      } else {
        out.push(arr[i]);
      }
    }
    while (out.length < SIZE) out.push(0);
    return { line: out, gain: gain };
  }

  function move(dir) {
    if (over) return;
    var old = JSON.stringify(grid);
    var gain = 0;
    if (dir === "left" || dir === "right") {
      for (var r = 0; r < SIZE; r++) {
        var row = grid[r].slice();
        if (dir === "right") row.reverse();
        var res = slideLine(row);
        if (dir === "right") res.line.reverse();
        grid[r] = res.line;
        gain += res.gain;
      }
    } else {
      for (var c = 0; c < SIZE; c++) {
        var col = [];
        for (var r2 = 0; r2 < SIZE; r2++) col.push(grid[r2][c]);
        if (dir === "down") col.reverse();
        var res2 = slideLine(col);
        if (dir === "down") res2.line.reverse();
        for (var r3 = 0; r3 < SIZE; r3++) grid[r3][c] = res2.line[r3];
        gain += res2.gain;
      }
    }
    if (JSON.stringify(grid) === old) return;
    score += gain;
    if (score > best) {
      best = score;
      try { localStorage.setItem("nc2048best", String(best)); } catch (e) {}
      if (bestEl) bestEl.textContent = best;
    }
    if (scoreEl) scoreEl.textContent = score;
    addTile();
    render();
    if (won) {
      over = true;
      showOverlay("🎉 达成 2048！", "太强了，可以继续玩");
    } else if (!canMove()) {
      over = true;
      showOverlay("💀 无路可走", "游戏结束，得分 " + score);
    }
  }

  function canMove() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (grid[r][c] === 0) return true;
        if (c + 1 < SIZE && grid[r][c] === grid[r][c + 1]) return true;
        if (r + 1 < SIZE && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  function showOverlay(title, sub) {
    var ov = document.createElement("div");
    ov.className = "g-overlay";
    var h = document.createElement("div");
    h.textContent = title;
    var s = document.createElement("div");
    s.style.fontSize = "0.9rem";
    s.style.fontWeight = "400";
    s.textContent = sub;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary";
    btn.textContent = "再来一局";
    btn.addEventListener("click", function () { ov.remove(); newGame(); });
    ov.appendChild(h);
    ov.appendChild(s);
    ov.appendChild(btn);
    boardEl.appendChild(ov);
  }

  document.addEventListener("keydown", function (ev) {
    var key = ev.key;
    var map = {
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right",
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down"
    };
    if (map[key]) {
      ev.preventDefault();
      move(map[key]);
    }
  });

  // 触屏滑动
  var sx = 0, sy = 0, swiped = false;
  boardEl.addEventListener("touchstart", function (ev) {
    var t = ev.touches[0];
    sx = t.clientX; sy = t.clientY; swiped = false;
  }, { passive: true });
  boardEl.addEventListener("touchmove", function (ev) { ev.preventDefault(); }, { passive: false });
  boardEl.addEventListener("touchend", function (ev) {
    if (swiped) return;
    var t = ev.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  }, { passive: true });

  if (newBtn) newBtn.addEventListener("click", function () { newGame(); });

  newGame();
})();
