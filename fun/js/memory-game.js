/* 记忆翻牌：8 对 */
(function () {
  "use strict";
  var board = document.getElementById("memory-board");
  var status = document.getElementById("memory-status");
  if (!board) return;
  var SYMBOLS = ["★", "♥", "✦", "☀", "✿", "♬", "☾", "◆"];
  var cards = [], first = null, lock = false, moves = 0, matched = 0;

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function build() {
    board.innerHTML = "";
    cards = [];
    first = null; lock = false; moves = 0; matched = 0;
    var pool = shuffle(SYMBOLS.concat(SYMBOLS));
    pool.forEach(function (sym, i) {
      var tile = document.createElement("button");
      tile.type = "button";
      tile.className = "memory-tile";
      tile.setAttribute("aria-label", "卡片 " + (i + 1));
      tile.dataset.sym = sym;
      tile.addEventListener("click", function () { flip(tile); });
      board.appendChild(tile);
      cards.push(tile);
    });
    if (status) status.textContent = "翻开两张相同的卡片配对";
  }
  function flip(tile) {
    if (lock || tile.classList.contains("flipped") || tile.classList.contains("matched")) return;
    tile.textContent = tile.dataset.sym;
    tile.classList.add("flipped");
    if (!first) { first = tile; return; }
    moves++;
    if (first.dataset.sym === tile.dataset.sym) {
      first.classList.add("matched");
      tile.classList.add("matched");
      first = null;
      matched++;
      if (matched === SYMBOLS.length) {
        if (status) status.textContent = "恭喜！共 " + moves + " 步完成配对";
      } else if (status) {
        status.textContent = "配对成功，当前 " + moves + " 步";
      }
    } else {
      lock = true;
      var a = first, b = tile;
      first = null;
      setTimeout(function () {
        a.classList.remove("flipped"); a.textContent = "";
        b.classList.remove("flipped"); b.textContent = "";
        lock = false;
      }, 620);
      if (status) status.textContent = "未配对，已走 " + moves + " 步";
    }
  }
  var restart = document.getElementById("memory-restart");
  if (restart) restart.addEventListener("click", build);
  build();
})();
