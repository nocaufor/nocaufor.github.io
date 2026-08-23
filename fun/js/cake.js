/* 生日蛋糕：DOM 构建 + 点蜡烛 */
(function () {
  "use strict";
  var stage = document.getElementById("cake-stage");
  if (!stage) return;
  var note = document.getElementById("cake-note");
  var lit = false;

  stage.innerHTML =
    '<div class="cake-body" style="position:relative;display:inline-block;padding-top:46px">' +
    '  <div class="cake-layer" style="width:300px;height:56px;border-radius:14px;background:var(--bg);border:1px solid var(--line-strong);margin:0 auto;position:relative">' +
    '    <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:0.8rem;letter-spacing:0.3em;color:var(--text-soft)">HAPPY BIRTHDAY</span>' +
    '  </div>' +
    '  <div class="cake-layer" style="width:240px;height:44px;border-radius:12px;background:var(--bg-soft);border:1px solid var(--line);margin:-2px auto 0"></div>' +
    '  <div class="cake-base" style="width:300px;height:26px;border-radius:0 0 14px 14px;background:var(--bg);border:1px solid var(--line-strong);border-top:0;margin:-2px auto 0"></div>' +
    '  <div class="candle-row" style="position:absolute;top:0;left:50%;transform:translateX(-50%);display:flex;gap:14px">' +
    '    <div class="candle" data-i="0" role="button" tabindex="0" aria-label="蜡烛一" style="position:relative;width:10px;height:40px;background:#d8dee9;border-radius:4px;cursor:pointer"></div>' +
    '    <div class="candle" data-i="1" role="button" tabindex="0" aria-label="蜡烛二" style="position:relative;width:10px;height:52px;background:#d8dee9;border-radius:4px;cursor:pointer"></div>' +
    '    <div class="candle" data-i="2" role="button" tabindex="0" aria-label="蜡烛三" style="position:relative;width:10px;height:44px;background:#d8dee9;border-radius:4px;cursor:pointer"></div>' +
    '  </div>' +
    '</div>';

  function flame(candle) {
    var f = document.createElement("span");
    f.className = "candle-flame";
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:absolute;left:50%;bottom:100%;width:14px;height:20px;transform:translateX(-50%);background:radial-gradient(circle at 50% 78%, #e3b341 0%, #e07b54 45%, transparent 72%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;animation:flame-flicker 0.4s ease-in-out infinite alternate;filter:blur(0.4px)";
    candle.appendChild(f);
    candle.setAttribute("data-lit", "1");
    candle.style.background = "#8fa8bd";
  }
  function extinguish(candle) {
    var f = candle.querySelector(".candle-flame");
    if (f) f.remove();
    candle.removeAttribute("data-lit");
    candle.style.background = "#d8dee9";
  }
  function toggle(candle) {
    if (candle.hasAttribute("data-lit")) { extinguish(candle); lit = false; if (note) note.textContent = "蜡烛已吹灭"; }
    else { flame(candle); lit = true; if (note) note.textContent = "蜡烛点亮了，快许个愿"; }
  }
  document.querySelectorAll("#cake-stage .candle").forEach(function (c) {
    c.addEventListener("click", function () { toggle(c); });
    c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(c); } });
  });
  var lightBtn = document.getElementById("cake-light");
  if (lightBtn) lightBtn.addEventListener("click", function () {
    document.querySelectorAll("#cake-stage .candle").forEach(function (c) { flame(c); });
    lit = true;
    if (note) note.textContent = "全部点亮，生日快乐";
  });
  var blowBtn = document.getElementById("cake-blow");
  if (blowBtn) blowBtn.addEventListener("click", function () {
    document.querySelectorAll("#cake-stage .candle").forEach(extinguish);
    lit = false;
    if (note) note.textContent = "呼——全部吹灭，愿望达成";
  });
})();
