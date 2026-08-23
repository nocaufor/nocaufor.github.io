/* 打字机情书 */
(function () {
  "use strict";
  var box = document.getElementById("love-letter-text");
  if (!box) return;
  var note = document.getElementById("love-note");
  var letter = "亲爱的你：\n\n提笔的这一刻，窗外刚好有风。\n我忽然很想告诉你——\n\n谢谢你出现在我的生活里。\n像一束不早不晚的光，\n把我原本普通的日夜，照得温柔而明亮。\n\n往后余生，\n我想把每一次日出日落，\n都讲给你听。\n\n—— 永远爱你的 nocau";
  box.style.cssText = "font-size:1rem;line-height:2.2;white-space:pre-wrap;color:var(--text);text-align:left;min-height:300px;max-width:420px;margin:0 auto;letter-spacing:0.03em;border-left:1px solid var(--line);padding-left:20px";

  var timer = null;
  function play() {
    if (timer) clearInterval(timer);
    box.textContent = "";
    var i = 0;
    timer = setInterval(function () {
      if (i <= letter.length) { box.textContent = letter.slice(0, i); i++; }
      else { clearInterval(timer); timer = null; if (note) note.textContent = "信已写完，等你来读"; }
    }, 58);
    if (note) note.textContent = "正在书写中…";
  }
  var replay = document.getElementById("love-replay");
  if (replay) replay.addEventListener("click", play);
  play();
})();
