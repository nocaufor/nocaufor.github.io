/* nocau Fun 扫雷：经典扫雷（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var boardEl = document.getElementById("ms-board");
  var statusEl = document.getElementById("ms-status");
  var levelEl = document.getElementById("ms-level");
  var newBtn = document.getElementById("ms-new");
  var chordBtn = document.getElementById("ms-chord");
  if (!boardEl) return;

  var LEVELS = [
    { rows: 9, cols: 9, mines: 10 },
    { rows: 16, cols: 16, mines: 40 },
    { rows: 16, cols: 30, mines: 99 }
  ];

  var state = null;
  var timer = null;

  function levelConf() {
    return LEVELS[parseInt(levelEl.value, 10) || 0];
  }

  function initBoard() {
    var conf = levelConf();
    var rows = conf.rows, cols = conf.cols, mines = conf.mines;
    var grid = [];
    for (var r = 0; r < rows; r++) {
      grid.push([]);
      for (var c = 0; c < cols; c++) {
        grid[r].push({ mine: false, open: false, flag: false, around: 0 });
      }
    }
    var placed = 0;
    while (placed < mines) {
      var r = Math.floor(Math.random() * rows);
      var c = Math.floor(Math.random() * cols);
      if (!grid[r][c].mine) {
        grid[r][c].mine = true;
        placed++;
      }
    }
    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        if (grid[rr][cc].mine) continue;
        grid[rr][cc].around = countAround(grid, rr, cc, rows, cols);
      }
    }
    state = { grid: grid, rows: rows, cols: cols, mines: mines, flags: 0, opened: 0, over: false, win: false, first: true };
    render();
    if (statusEl) statusEl.textContent = "雷数 " + mines + " · 已标旗 0 · 点击翻开第一格";
  }

  function countAround(grid, r, c, rows, cols) {
    var n = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) n++;
      }
    }
    return n;
  }

  function render() {
    var rows = state.rows, cols = state.cols;
    boardEl.style.setProperty("--n", cols);
    /* 触控目标：默认 38px；窄屏放不下时自适应收缩（9×9 等小列），大列数保持 38px + 横向滚动兜底 */
    var cell = 38;
    if (cols <= 12 && boardEl.parentElement) {
      var wrapW = boardEl.parentElement.clientWidth;
      if (wrapW > 0) {
        var fit = Math.floor((wrapW - 4 - 2 * (cols - 1)) / cols); /* padding 2*2 + gap 1*(cols-1) */
        if (fit < cell) cell = Math.max(24, fit);
      }
    }
    boardEl.style.setProperty("--cell", cell + "px");
    boardEl.style.gridTemplateColumns = "repeat(" + cols + ", var(--cell))";
    boardEl.innerHTML = "";
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = state.grid[r][c];
        var div = document.createElement("div");
        div.className = "ms-cell" + (cell.open ? " open" : "");
        div.dataset.r = r;
        div.dataset.c = c;
        if (cell.open && cell.mine) {
          div.textContent = "💣";
          if (cell.hit) div.classList.add("mine-hit");
        } else if (cell.open && cell.around > 0) {
          div.textContent = cell.around;
          div.classList.add("c" + cell.around);
        } else if (cell.flag) {
          div.innerHTML = "<span class=\"flag\">🚩</span>";
        }
        div.addEventListener("click", onLeft);
        div.addEventListener("contextmenu", onRight);
        boardEl.appendChild(div);
      }
    }
    /* 超宽棋盘左对齐交由 ms-wrap 横向滚动；未超宽保持居中（9×9 无横滚） */
    var wrapW2 = boardEl.parentElement ? boardEl.parentElement.clientWidth : 0;
    boardEl.classList.toggle("wide", boardEl.offsetWidth > wrapW2);
  }

  function onLeft(ev) {
    if (!state || state.over) return;
    var r = +ev.currentTarget.dataset.r, c = +ev.currentTarget.dataset.c;
    var cell = state.grid[r][c];
    if (cell.flag || cell.open) return;
    if (state.first) {
      if (cell.mine) {
        // 首次点击避开雷：把雷移到别处
        moveMineAway(r, c);
      }
      state.first = false;
    }
    open(r, c);
    checkEnd();
  }

  function onRight(ev) {
    ev.preventDefault();
    if (!state || state.over) return;
    var r = +ev.currentTarget.dataset.r, c = +ev.currentTarget.dataset.c;
    var cell = state.grid[r][c];
    if (cell.open) return;
    cell.flag = !cell.flag;
    state.flags += cell.flag ? 1 : -1;
    if (statusEl) statusEl.textContent = "雷数 " + state.mines + " · 已标旗 " + state.flags + " · 右键标旗/取消";
    render();
  }

  function moveMineAway(r, c) {
    var rows = state.rows, cols = state.cols;
    var grid = state.grid;
    grid[r][c].mine = false;
    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        if (!grid[rr][cc].mine && !(rr === r && cc === c)) {
          grid[rr][cc].mine = true;
          grid[rr][cc].around = 0;
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              var nr = rr + dr, nc = cc + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc].mine) grid[rr][cc].around++;
            }
          }
          break;
        }
      }
      if (grid[r][c].mine) break;
    }
    // 重新计算 all around
    for (var ar = 0; ar < rows; ar++) {
      for (var ac = 0; ac < cols; ac++) {
        if (!grid[ar][ac].mine) grid[ar][ac].around = countAround(grid, ar, ac, rows, cols);
      }
    }
  }

  function open(r, c) {
    var cell = state.grid[r][c];
    if (cell.open || cell.flag) return;
    cell.open = true;
    state.opened++;
    if (cell.mine) {
      cell.hit = true;
      revealMines();
      state.over = true;
      if (statusEl) statusEl.textContent = "💥 踩到地雷，游戏结束";
      return;
    }
    if (cell.around === 0) {
      // 洪泛展开
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          var nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
            open(nr, nc);
          }
        }
      }
    }
  }

  function revealMines() {
    for (var r = 0; r < state.rows; r++) {
      for (var c = 0; c < state.cols; c++) {
        var cell = state.grid[r][c];
        if (cell.mine) cell.open = true;
      }
    }
    render();
  }

  function checkEnd() {
    var safe = state.rows * state.cols - state.mines;
    if (state.opened >= safe && !state.over) {
      state.over = true;
      state.win = true;
      if (statusEl) statusEl.textContent = "🎉 恭喜通关！所有安全格已翻开";
      render();
    } else if (!state.over) {
      render();
      if (statusEl) statusEl.textContent = "雷数 " + state.mines + " · 已标旗 " + state.flags + " · 已翻开 " + state.opened + "/" + safe;
    }
  }

  // 双击数字：chord 快速展开
  function chord(ev) {
    var target = ev.target.closest ? ev.target.closest(".ms-cell") : null;
    if (!target || !state || state.over) return;
    var r = +target.dataset.r, c = +target.dataset.c;
    var cell = state.grid[r][c];
    if (!cell.open || cell.around === 0) return;
    // 统计周围旗数
    var flagCount = 0, mineCount = 0;
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          var nb = state.grid[nr][nc];
          if (nb.flag) flagCount++;
          if (nb.mine) mineCount++;
        }
      }
    }
    if (flagCount !== cell.around) return;
    for (var dr2 = -1; dr2 <= 1; dr2++) {
      for (var dc2 = -1; dc2 <= 1; dc2++) {
        var nr2 = r + dr2, nc2 = c + dc2;
        if (nr2 >= 0 && nr2 < state.rows && nc2 >= 0 && nc2 < state.cols) {
          var nb2 = state.grid[nr2][nc2];
          if (!nb2.flag && !nb2.open) open(nr2, nc2);
        }
      }
    }
    checkEnd();
  }

  if (newBtn) newBtn.addEventListener("click", function () { initBoard(); });
  if (levelEl) levelEl.addEventListener("change", function () { initBoard(); });
  if (chordBtn) chordBtn.addEventListener("click", function () {
    // 双击数字由 dblclick 触发，按钮仅提示
    if (statusEl) statusEl.textContent = "提示：在已翻开数字格上双击即可快速展开";
  });
  boardEl.addEventListener("dblclick", chord);
  // 阻止棋盘右键菜单
  boardEl.addEventListener("contextmenu", function (ev) { ev.preventDefault(); });

  initBoard();
})();
