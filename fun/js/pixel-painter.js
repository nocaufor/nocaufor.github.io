/* 像素画板 16x16 */
(function () {
  "use strict";
  var board = document.getElementById("pixel-board");
  if (!board) return;
  var N = 16;
  var color = "#6f8fa8";
  board.style.gridTemplateColumns = "repeat(" + N + ", 1fr)";
  board.style.width = "min(360px, 88%)";

  var cells = [];
  for (var i = 0; i < N * N; i++) {
    var c = document.createElement("button");
    c.type = "button";
    c.className = "pixel-cell";
    c.setAttribute("aria-label", "像素 " + (i + 1));
    board.appendChild(c);
    cells.push(c);
  }
  var painting = false;
  function paint(c) { c.classList.add("is-painted"); c.style.color = color; }
  board.addEventListener("pointerdown", function (e) {
    var c = e.target.closest(".pixel-cell");
    if (!c) return;
    painting = true;
    paint(c);
  });
  window.addEventListener("pointerup", function () { painting = false; });
  board.addEventListener("pointerover", function (e) {
    if (!painting) return;
    var c = e.target.closest(".pixel-cell");
    if (c) paint(c);
  });
  document.querySelectorAll(".pixel-color").forEach(function (sw) {
    sw.addEventListener("click", function () {
      document.querySelectorAll(".pixel-color").forEach(function (s) { s.classList.remove("is-active"); });
      sw.classList.add("is-active");
      color = sw.getAttribute("data-color");
    });
  });
  var clearBtn = document.getElementById("pixel-clear");
  if (clearBtn) clearBtn.addEventListener("click", function () {
    cells.forEach(function (c) { c.classList.remove("is-painted"); });
  });
})();
