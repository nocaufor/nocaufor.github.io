/* 表白页：打字机告白 + 满屏小心心 + 三套主题（暖橙心动 / 星空告白 / 樱粉浪漫） */
(function () {
  "use strict";
  var box = document.getElementById("confession-text");
  if (!box) return;
  var note = document.getElementById("confession-note");
  var started = false, timer = null;
  var activeTheme = "ember";

  var THEMES = {
    ember: {
      text: "遇见你之后，\n我所有的浪漫都有了名字。\n想和你一起看烟花、数星星、\n走过每一个平凡又闪亮的日子。\n\n—— 喜欢你的第 365 天",
      color: "#e07b54",
      soft: "#a3779e",
      halo: "radial-gradient(circle at 50% 42%, rgba(227,123,84,0.14), transparent 62%)",
      accent: "#e07b54"
    },
    midnight: {
      text: "以前总觉得夜空很远，\n直到看见你眼底的光。\n想陪你看遍四季星辰，\n在每一个安静的夜晚，\n把喜欢说给你听。\n\n—— 来自你的小星球",
      color: "#7fb3ff",
      soft: "#c3a6ff",
      halo: "radial-gradient(circle at 50% 42%, rgba(127,179,255,0.16), transparent 62%)",
      accent: "#ffd166"
    },
    blossom: {
      text: "春天来得悄无声息，\n像你出现在我的世界里。\n想和你走花路、吹晚风、\n把平凡的日常过成诗。\n\n—— 心动第 365 个清晨",
      color: "#e0708a",
      soft: "#c98bb8",
      halo: "radial-gradient(circle at 50% 42%, rgba(224,112,138,0.15), transparent 62%)",
      accent: "#d98e4a"
    }
  };

  var halo = document.createElement("div");
  halo.setAttribute("aria-hidden", "true");
  halo.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:-1;transition:background 0.8s ease";
  document.body.appendChild(halo);

  function applyTheme() {
    var t = THEMES[activeTheme];
    box.style.cssText = "font-size:1.1rem;line-height:2.1;white-space:pre-wrap;color:" + t.color + ";text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center;letter-spacing:0.04em;font-weight:600;padding:16px 10px;transition:color 0.6s ease";
    halo.style.background = t.halo;
    var btns = document.getElementById("confession-picker");
    if (btns) Array.prototype.forEach.call(btns.querySelectorAll(".btn"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-style") === activeTheme);
    });
  }

  function typewrite() {
    var t = THEMES[activeTheme];
    if (timer) clearTimeout(timer);
    started = true;
    box.textContent = "";
    var i = 0;
    var blink = document.createElement("span");
    blink.setAttribute("aria-hidden", "true");
    blink.style.cssText = "display:inline-block;width:2px;height:1.05em;background:" + t.accent + ";margin-left:2px;vertical-align:-2px;animation:twinkle 0.9s steps(1) infinite";
    box.appendChild(blink);
    function tick() {
      if (i <= t.text.length) {
        box.textContent = t.text.slice(0, i);
        box.appendChild(blink);
        i++;
        timer = setTimeout(tick, 58);
      } else {
        if (note) note.textContent = "我的心意，都写在这里了";
      }
    }
    tick();
  }

  function spawnHearts(n) {
    var t = THEMES[activeTheme];
    for (var i = 0; i < n; i++) {
      var h = document.createElement("span");
      h.setAttribute("aria-hidden", "true");
      h.textContent = "♥";
      h.style.cssText = "position:fixed;z-index:9990;font-size:" + (14 + Math.random() * 26) + "px;color:" + (Math.random() > 0.5 ? t.color : t.soft) + ";left:" + (Math.random() * 100) + "vw;top:" + (Math.random() * 100 + 20) + "vh;pointer-events:none;opacity:0.85;animation:heart-rise 3.4s ease-in forwards;will-change:transform,opacity";
      document.body.appendChild(h);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }, 3600);
    }
  }

  function setTheme(theme) {
    if (theme === activeTheme) return;
    activeTheme = theme;
    applyTheme();
    if (note) note.textContent = "已切换主题：" + (theme === "ember" ? "暖橙心动" : theme === "midnight" ? "星空告白" : "樱粉浪漫");
  }

  applyTheme();

  var startBtn = document.getElementById("confession-start");
  if (startBtn) startBtn.addEventListener("click", function () { typewrite(); });
  var heartsBtn = document.getElementById("confession-hearts");
  if (heartsBtn) heartsBtn.addEventListener("click", function () { if (!started) typewrite(); spawnHearts(60); if (note) note.textContent = "满屏都是喜欢"; });
  var replayBtn = document.getElementById("confession-replay");
  if (replayBtn) replayBtn.addEventListener("click", function () { typewrite(); if (note) note.textContent = "再说一次，也说不够"; });
  var picker = document.getElementById("confession-picker");
  if (picker) picker.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-style]") : null;
    if (b) setTheme(b.getAttribute("data-style"));
  });
})();
