/* 表白页：打字机告白 + 满屏小心心 */
(function () {
  "use strict";
  var box = document.getElementById("confession-text");
  if (!box) return;
  var note = document.getElementById("confession-note");
  var started = false, timer = null;

  var text = "遇见你之后，\n我所有的浪漫都有了名字。\n想和你一起看烟花、数星星、\n走过每一个平凡又闪亮的日子。\n\n—— 喜欢你的第 365 天";
  box.style.cssText = "font-size:1.1rem;line-height:2.1;white-space:pre-wrap;color:var(--text);text-align:center;min-height:180px;display:flex;align-items:center;justify-content:center;letter-spacing:0.04em;font-weight:600";

  function typewrite() {
    started = true;
    box.textContent = "";
    var i = 0;
    function tick() {
      if (i <= text.length) {
        box.textContent = text.slice(0, i);
        i++;
        timer = setTimeout(tick, 66);
      } else {
        if (note) note.textContent = "我的心意，都写在这里了";
      }
    }
    tick();
  }
  function spawnHearts(n) {
    for (var i = 0; i < n; i++) {
      var h = document.createElement("span");
      h.setAttribute("aria-hidden", "true");
      h.textContent = "♥";
      h.style.cssText = "position:fixed;z-index:9990;font-size:" + (14 + Math.random() * 26) + "px;color:" + (Math.random() > 0.5 ? "#e07b54" : "#a3779e") + ";left:" + (Math.random() * 100) + "vw;top:" + (Math.random() * 100 + 20) + "vh;pointer-events:none;opacity:0.85;animation:heart-rise 3.4s ease-in forwards;will-change:transform,opacity";
      document.body.appendChild(h);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }, 3600);
    }
  }
  var startBtn = document.getElementById("confession-start");
  if (startBtn) startBtn.addEventListener("click", function () { typewrite(); });
  var heartsBtn = document.getElementById("confession-hearts");
  if (heartsBtn) heartsBtn.addEventListener("click", function () { if (!started) typewrite(); spawnHearts(60); if (note) note.textContent = "满屏都是喜欢"; });
})();
