/* 打字机情书：信纸质感 + 三套信纸风格（复古牛皮纸 / 青蓝墨色 / 玫瑰粉韵）+ 速度控制 */
(function () {
  "use strict";
  var box = document.getElementById("love-letter-text");
  if (!box) return;
  var note = document.getElementById("love-note");
  var speed = 58;
  var activeTheme = "paper";
  var timer = null;

  var THEMES = {
    paper: {
      letter: "亲爱的你：\n\n提笔的这一刻，窗外刚好有风。\n我忽然很想告诉你——\n\n谢谢你出现在我的生活里。\n像一束不早不晚的光，\n把我原本普通的日夜，照得温柔而明亮。\n\n往后余生，\n我想把每一次日出日落，\n都讲给你听。\n\n—— 永远爱你的 nocau",
      css: "font-size:1rem;line-height:2.2;white-space:pre-wrap;color:#4a4238;text-align:left;min-height:320px;max-width:440px;margin:0 auto;letter-spacing:0.03em;border-left:3px solid #c89b3c;padding:26px 28px;border-radius:0 14px 14px 0;background:linear-gradient(180deg,#f3ecdd,#e7dcc3);box-shadow:inset 0 0 40px rgba(120,90,40,0.10);transition:background 0.6s ease,color 0.6s ease"
    },
    ink: {
      letter: "Dear you：\n\n此刻深夜，世界安静得像一张纸。\n而我想写给你的，\n是一封藏了很久的信。\n\n你像一束不早不晚的光，\n落进我兵荒马乱的日子里，\n从此所有代码都有了温度。\n\n往后的每一行程序，\n都只想为你运行。\n\n—— Yours, nocau",
      css: "font-size:1rem;line-height:2.2;white-space:pre-wrap;color:#cfe0f2;text-align:left;min-height:320px;max-width:440px;margin:0 auto;letter-spacing:0.03em;border-left:3px solid #7ba0c9;padding:26px 28px;border-radius:0 14px 14px 0;background:linear-gradient(180deg,#16233f,#1b2f5c);box-shadow:inset 0 0 40px rgba(20,40,90,0.35);transition:background 0.6s ease,color 0.6s ease"
    },
    rose: {
      letter: "致最温柔的你：\n\n如果风有形状，\n那一定是你笑起来的样子。\n\n我想把春天寄给你，\n把清晨的露水、傍晚的晚霞、\n和每一次心动，都装进信封。\n\n只要你愿意，\n这封信可以一直写下去。\n\n—— 想你的 nocau",
      css: "font-size:1rem;line-height:2.2;white-space:pre-wrap;color:#5a3a44;text-align:left;min-height:320px;max-width:440px;margin:0 auto;letter-spacing:0.03em;border-left:3px solid #e0708a;padding:26px 28px;border-radius:0 14px 14px 0;background:linear-gradient(180deg,#fdeef0,#f6dbe1);box-shadow:inset 0 0 40px rgba(224,112,138,0.12);transition:background 0.6s ease,color 0.6s ease"
    }
  };

  function applyTheme() {
    box.style.cssText = THEMES[activeTheme].css;
    var btns = document.getElementById("love-picker");
    if (btns) Array.prototype.forEach.call(btns.querySelectorAll(".btn"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-style") === activeTheme);
    });
  }

  function play() {
    if (timer) clearInterval(timer);
    box.textContent = "";
    var i = 0;
    timer = setInterval(function () {
      if (i <= THEMES[activeTheme].letter.length) { box.textContent = THEMES[activeTheme].letter.slice(0, i); i++; }
      else { clearInterval(timer); timer = null; if (note) note.textContent = "信已写完，等你来读"; }
    }, speed);
    if (note) note.textContent = "正在书写中…";
  }

  function setTheme(theme) {
    if (theme === activeTheme) return;
    activeTheme = theme;
    applyTheme();
    if (note) note.textContent = "已切换信纸：" + (theme === "paper" ? "复古牛皮纸" : theme === "ink" ? "青蓝墨色" : "玫瑰粉韵");
  }

  applyTheme();

  var replayBtn = document.getElementById("love-replay");
  if (replayBtn) replayBtn.addEventListener("click", play);
  var slowerBtn = document.getElementById("love-slower");
  if (slowerBtn) slowerBtn.addEventListener("click", function () { speed = Math.min(200, speed + 30); if (note) note.textContent = "放慢一点，慢慢写"; });
  var fasterBtn = document.getElementById("love-faster");
  if (fasterBtn) fasterBtn.addEventListener("click", function () { speed = Math.max(18, speed - 20); if (note) note.textContent = "写快一点啦"; });
  var picker = document.getElementById("love-picker");
  if (picker) picker.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-style]") : null;
    if (b) setTheme(b.getAttribute("data-style"));
  });
})();
