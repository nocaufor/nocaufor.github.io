/* 生日祝福卡片：翻开 + 彩带 + 多主题挑选（经典鎏金 / 星空蓝夜 / 樱粉暖阳） */
(function () {
  "use strict";
  var wrap = document.getElementById("birthday-card");
  if (!wrap) return;
  var note = document.getElementById("birthday-note");
  var opened = false;
  var activeTheme = "classic";

  var THEMES = {
    classic: {
      coverBg: "linear-gradient(135deg,#f7f3e9,#efe6d2)",
      coverText: "#4a4238",
      accent: "#c89b3c",
      title: "生日快乐",
      insideText: "愿每一个明天都闪闪发光",
      insideSub: "新的一岁，平安喜乐，<br>万事胜意，继续做喜欢的事。",
      confetti: ["#c89b3c", "#d98e4a", "#7ba05b", "#a3779e", "#8fa8bd"]
    },
    star: {
      coverBg: "linear-gradient(135deg,#101c3a,#1b2f63)",
      coverText: "#eef2ff",
      accent: "#ffd166",
      title: "生日快乐",
      insideText: "愿星河长明，愿你所愿皆成",
      insideSub: "把愿望写进星光里，<br>每一颗都会为你闪烁。",
      confetti: ["#ffd166", "#7fb3ff", "#c3a6ff", "#ff9fb2", "#8ee0c8"]
    },
    sakura: {
      coverBg: "linear-gradient(135deg,#fdeef0,#f8d8de)",
      coverText: "#5a3a44",
      accent: "#e0708a",
      title: "生日快乐",
      insideText: "像春天的第一朵花开",
      insideSub: "愿温柔常伴左右，<br>每一天都有好事发生。",
      confetti: ["#e0708a", "#f4a7b9", "#c98bb8", "#f7d6a3", "#a5c9c1"]
    }
  };

  function buildCard() {
    var t = THEMES[activeTheme];
    wrap.innerHTML =
      '<div class="birthday-card-cover" style="width:min(340px,84vw);height:230px;border:1px solid var(--line-strong);border-radius:16px;position:relative;overflow:hidden;margin:0 auto;background:' + t.coverBg + ';color:' + t.coverText + '">' +
      '  <div id="card-cover" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:' + t.coverBg + ';transition:transform 0.8s cubic-bezier(0.2,0.7,0.3,1);z-index:2">' +
      '    <span style="font-size:0.78rem;letter-spacing:0.34em;color:' + t.accent + '">TO YOU</span>' +
      '    <span style="font-size:1.5rem;font-weight:800">' + t.title + '</span>' +
      '    <span style="font-size:0.78rem;opacity:0.72">点按钮翻开</span>' +
      '    <span style="font-size:1.6rem;opacity:0.9">' + (activeTheme === "classic" ? "&#127874;" : activeTheme === "star" ? "&#10024;" : "&#127800;") + '</span>' +
      '  </div>' +
      '  <div id="card-inside" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;background:' + t.coverBg + '">' +
      '    <span style="font-size:1.05rem;font-weight:700;color:' + t.coverText + '">' + t.insideText + '</span>' +
      '    <span style="font-size:0.86rem;line-height:1.8;opacity:0.82">' + t.insideSub + '</span>' +
      '    <span style="font-size:0.72rem;letter-spacing:0.2em;color:' + t.accent + '">FROM NOCAU</span>' +
      '  </div>' +
      '</div>';
    var cover = document.getElementById("card-cover");
    if (opened) cover.style.transform = "rotateY(-160deg)";
    return cover;
  }

  var cover = buildCard();

  function openCard() {
    if (opened) return;
    opened = true;
    cover = document.getElementById("card-cover");
    cover.style.transform = "rotateY(-160deg)";
    cover.style.transformOrigin = "left center";
    if (note) note.textContent = "祝你生日快乐";
  }

  function confetti() {
    if (!opened) openCard();
    var box = wrap.querySelector("div");
    var t = THEMES[activeTheme];
    for (var i = 0; i < 52; i++) {
      var piece = document.createElement("span");
      piece.setAttribute("aria-hidden", "true");
      piece.style.cssText = "position:absolute;top:-8px;left:" + (Math.random() * 100) + "%;width:" + (4 + Math.random() * 6) + "px;height:" + (8 + Math.random() * 8) + "px;background:" + t.confetti[(Math.random() * t.confetti.length) | 0] + ";border-radius:2px;z-index:3;pointer-events:none;animation:confetti-fall " + (2.2 + Math.random() * 1.8) + "s linear forwards;animation-delay:" + Math.random() * 0.6 + "s;opacity:0.9";
      box.appendChild(piece);
      setTimeout(function (p) { if (p.parentNode) p.parentNode.removeChild(p); }, 5200);
    }
    if (note) note.textContent = "彩带飘落，生日快乐";
  }

  function setTheme(theme) {
    if (theme === activeTheme) return;
    activeTheme = theme;
    wrap.setAttribute("class", "birthday-card-wrap birthday-theme theme-" + theme);
    cover = buildCard();
    if (note) note.textContent = "已切换主题：" + (theme === "classic" ? "经典鎏金" : theme === "star" ? "星空蓝夜" : "樱粉暖阳");
    var btns = document.getElementById("birthday-picker");
    if (btns) Array.prototype.forEach.call(btns.querySelectorAll(".btn"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-style") === theme);
    });
  }

  var openBtn = document.getElementById("birthday-open");
  if (openBtn) openBtn.addEventListener("click", openCard);
  var cfBtn = document.getElementById("birthday-confetti");
  if (cfBtn) cfBtn.addEventListener("click", confetti);
  var picker = document.getElementById("birthday-picker");
  if (picker) picker.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-style]") : null;
    if (b) setTheme(b.getAttribute("data-style"));
  });
})();
