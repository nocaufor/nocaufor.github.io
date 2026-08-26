/* nocau Fun 井字棋：人机/双人对战（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var boardEl = document.getElementById("t-board");
  var statusEl = document.getElementById("t-status");
  var modeBtn = document.getElementById("t-mode");
  var restartBtn = document.getElementById("t-restart");
  if (!boardEl) return;

  var vsAI = true;
  var board = ["", "", "", "", "", "", "", "", ""];
  var turn = "X"; // X 玩家 / O AI
  var gameOver = false;

  var WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function render() {
    boardEl.innerHTML = "";
    for (var i = 0; i < 9; i++) {
      var div = document.createElement("div");
      div.className = "t-cell" + (board[i] === "X" ? " t-x" : board[i] === "O" ? " t-o" : "");
      if (board[i]) div.textContent = board[i];
      div.dataset.idx = i;
      div.addEventListener("click", onCell);
      boardEl.appendChild(div);
    }
  }

  function checkWin(bd, p) {
    for (var i = 0; i < WIN_LINES.length; i++) {
      var l = WIN_LINES[i];
      if (bd[l[0]] === p && bd[l[1]] === p && bd[l[2]] === p) return l;
    }
    return null;
  }

  function isFull(bd) {
    return bd.every(function (v) { return v !== ""; });
  }

  function evaluate(bd) {
    if (checkWin(bd, "O")) return 10;
    if (checkWin(bd, "X")) return -10;
    return 0;
  }

  // 极小极大搜索
  function minimax(bd, depth, isMax, alpha, beta) {
    var sc = evaluate(bd);
    if (sc === 10 || sc === -10) return sc;
    if (isFull(bd)) return 0;
    if (isMax) {
      var best = -Infinity;
      for (var i = 0; i < 9; i++) {
        if (bd[i] === "") {
          bd[i] = "O";
          best = Math.max(best, minimax(bd, depth + 1, false, alpha, beta));
          bd[i] = "";
          alpha = Math.max(alpha, best);
          if (beta <= alpha) break;
        }
      }
      return best;
    } else {
      var worst = Infinity;
      for (var j = 0; j < 9; j++) {
        if (bd[j] === "") {
          bd[j] = "X";
          worst = Math.min(worst, minimax(bd, depth + 1, true, alpha, beta));
          bd[j] = "";
          beta = Math.min(beta, worst);
          if (beta <= alpha) break;
        }
      }
      return worst;
    }
  }

  function aiMove() {
    var bestScore = -Infinity;
    var bestMoves = [];
    for (var i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = "O";
        var sc = minimax(board, 0, false, -Infinity, Infinity);
        board[i] = "";
        if (sc > bestScore) {
          bestScore = sc;
          bestMoves = [i];
        } else if (sc === bestScore) {
          bestMoves.push(i);
        }
      }
    }
    if (bestMoves.length) {
      var pick = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      setTimeout(function () {
        board[pick] = "O";
        afterMove();
      }, 280);
    }
  }

  function onCell(ev) {
    if (gameOver) return;
    if (turn !== "X") return;
    var idx = +ev.currentTarget.dataset.idx;
    if (board[idx] !== "") return;
    board[idx] = "X";
    afterMove();
    if (!gameOver && vsAI && turn === "O") aiMove();
  }

  function afterMove() {
    var wx = checkWin(board, "X");
    var wo = checkWin(board, "O");
    if (wx || wo) {
      gameOver = true;
      var winLine = wx || wo;
      var winner = wx ? "X" : "O";
      if (statusEl) statusEl.textContent = (winner === "X" ? "🎉 你赢了！" : "🤖 电脑赢了！");
      render();
      winLine.forEach(function (i) {
        var cell = boardEl.children[i];
        if (cell) cell.style.background = "var(--color-accent,#7aa2f7)";
      });
      return;
    }
    if (isFull(board)) {
      gameOver = true;
      if (statusEl) statusEl.textContent = "🤝 平局";
      render();
      return;
    }
    turn = turn === "X" ? "O" : "X";
    if (statusEl) statusEl.textContent = vsAI ? (turn === "X" ? "轮到你（X）" : "电脑思考中（O）…") : (turn === "X" ? "轮到 X" : "轮到 O");
    render();
  }

  function restart() {
    board = ["", "", "", "", "", "", "", "", ""];
    turn = "X";
    gameOver = false;
    if (statusEl) statusEl.textContent = vsAI ? "你是 X，先手" : "双人模式，X 先手";
    render();
  }

  if (modeBtn) modeBtn.addEventListener("click", function () {
    vsAI = !vsAI;
    modeBtn.textContent = vsAI ? "人机对战" : "双人模式";
    restart();
  });
  if (restartBtn) restartBtn.addEventListener("click", restart);

  restart();
})();
