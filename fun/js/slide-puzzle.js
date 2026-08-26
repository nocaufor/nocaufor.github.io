/* nocau Fun 滑块拼图：3×3 数字拼图（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var boardEl = document.getElementById("p-board");
  var statusEl = document.getElementById("p-status");
  var shuffleBtn = document.getElementById("p-shuffle");
  if (!boardEl) return;

  var SIZE = 3;
  var tiles = []; // 0 = empty
  var moves = 0;
  var started = false;

  function solved() {
    for (var i = 0; i < SIZE * SIZE - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[SIZE * SIZE - 1] === 0;
  }

  function emptyIndex() {
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i] === 0) return i;
    }
    return -1;
  }

  function canSlide(idx) {
    var e = emptyIndex();
    var r = Math.floor(idx / SIZE), c = idx % SIZE;
    var er = Math.floor(e / SIZE), ec = e % SIZE;
    return Math.abs(r - er) + Math.abs(c - ec) === 1;
  }

  function render() {
    boardEl.innerHTML = "";
    for (var i = 0; i < tiles.length; i++) {
      var div = document.createElement("div");
      div.className = "p-tile" + (tiles[i] === 0 ? " empty" : "");
      if (tiles[i] !== 0) div.textContent = tiles[i];
      div.dataset.idx = i;
      div.addEventListener("click", onTile);
      boardEl.appendChild(div);
    }
  }

  function onTile(ev) {
    var idx = +ev.currentTarget.dataset.idx;
    if (!canSlide(idx)) return;
    if (!started) started = true;
    var e = emptyIndex();
    tiles[e] = tiles[idx];
    tiles[idx] = 0;
    moves++;
    render();
    if (solved()) {
      if (statusEl) statusEl.textContent = "🎉 还原成功！共用 " + moves + " 步";
      started = false;
    } else if (started && statusEl) {
      if (statusEl) statusEl.textContent = "已移动 " + moves + " 步";
    }
  }

  function shuffle() {
    // 从完成状态做随机合法滑动，保证可解
    tiles = [];
    for (var i = 1; i <= SIZE * SIZE - 1; i++) tiles.push(i);
    tiles.push(0);
    moves = 0;
    started = false;
    var last = -1;
    for (var s = 0; s < 200; s++) {
      var e = emptyIndex();
      var er = Math.floor(e / SIZE), ec = e % SIZE;
      var cands = [];
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
          var nr = er + dr, nc = ec + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            var ni = nr * SIZE + nc;
            if (ni !== last) cands.push(ni);
          }
        }
      }
      if (!cands.length) continue;
      var pick = cands[Math.floor(Math.random() * cands.length)];
      tiles[e] = tiles[pick];
      tiles[pick] = 0;
      last = e;
    }
    if (statusEl) statusEl.textContent = "已打乱，开始还原";
    render();
  }

  if (shuffleBtn) shuffleBtn.addEventListener("click", shuffle);

  shuffle();
})();
