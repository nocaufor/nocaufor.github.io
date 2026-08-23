/* 生日祝福卡片：翻开 + 彩带 */
(function () {
  "use strict";
  var wrap = document.getElementById("birthday-card");
  if (!wrap) return;
  var note = document.getElementById("birthday-note");
  var opened = false;

  wrap.innerHTML =
    '<div style="width:min(340px,84vw);height:230px;border:1px solid var(--line-strong);border-radius:16px;background:var(--bg);position:relative;overflow:hidden;margin:0 auto">' +
    '  <div id="card-cover" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--bg-soft);transition:transform 0.8s cubic-bezier(0.2,0.7,0.3,1);z-index:2">' +
    '    <span style="font-size:0.78rem;letter-spacing:0.34em;color:var(--text-soft)">TO YOU</span>' +
    '    <span style="font-size:1.5rem;font-weight:800;color:var(--text)">生日快乐</span>' +
    '    <span style="font-size:0.78rem;color:var(--text-soft)">点按钮翻开</span>' +
    '  </div>' +
    '  <div id="card-inside" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center">' +
    '    <span style="font-size:1.05rem;font-weight:700;color:var(--text)">愿每一个明天都闪闪发光</span>' +
    '    <span style="font-size:0.86rem;color:var(--text-soft);line-height:1.8">新的一岁，平安喜乐，<br>万事胜意，继续做喜欢的事。</span>' +
    '    <span style="font-size:0.72rem;letter-spacing:0.2em;color:var(--brand)">FROM NOCAU</span>' +
    '  </div>' +
    '</div>';

  var cover = document.getElementById("card-cover");
  function openCard() {
    if (opened) return;
    opened = true;
    cover.style.transform = "rotateY(-160deg)";
    cover.style.transformOrigin = "left center";
    if (note) note.textContent = "祝你生日快乐";
  }
  function confetti() {
    if (!opened) openCard();
    var box = wrap.querySelector("div");
    var colors = ["#e3b341", "#e07b54", "#7ba05b", "#a3779e", "#8fa8bd"];
    for (var i = 0; i < 46; i++) {
      var piece = document.createElement("span");
      piece.setAttribute("aria-hidden", "true");
      piece.style.cssText = "position:absolute;top:-8px;left:" + (Math.random() * 100) + "%;width:" + (4 + Math.random() * 6) + "px;height:" + (8 + Math.random() * 8) + "px;background:" + colors[(Math.random() * colors.length) | 0] + ";border-radius:2px;z-index:3;pointer-events:none;animation:confetti-fall " + (2.2 + Math.random() * 1.8) + "s linear forwards;animation-delay:" + Math.random() * 0.6 + "s;opacity:0.9";
      box.appendChild(piece);
      setTimeout(function (p) { if (p.parentNode) p.parentNode.removeChild(p); }, 5200);
    }
    if (note) note.textContent = "彩带飘落，生日快乐";
  }
  var openBtn = document.getElementById("birthday-open");
  if (openBtn) openBtn.addEventListener("click", openCard);
  var cfBtn = document.getElementById("birthday-confetti");
  if (cfBtn) cfBtn.addEventListener("click", confetti);
})();
