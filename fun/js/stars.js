/* 星空许愿：闪烁星空 + 愿望化作流星 */
(function () {
  "use strict";
  var canvas = document.getElementById("stars-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, stars = [], meteors = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var n = 130;
    for (var i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2 });
    }
  }
  window.addEventListener("resize", resize);

  function wish(text) {
    var note = document.getElementById("stars-note");
    if (note) note.textContent = "愿望已送达：" + text;
    meteors.push({ x: Math.random() * W * 0.7 + W * 0.1, y: -20, vx: 5 + Math.random() * 3, vy: 3 + Math.random() * 2, life: 1, tail: [] });
  }
  function step(t) {
    ctx.clearRect(0, 0, W, H);
    var time = t * 0.001;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.6 + s.ph));
      ctx.fillStyle = "#d8dee9";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (var j = meteors.length - 1; j >= 0; j--) {
      var m = meteors[j];
      m.tail.push({ x: m.x, y: m.y });
      if (m.tail.length > 16) m.tail.shift();
      m.x += m.vx; m.y += m.vy; m.life -= 0.012;
      for (var k = 0; k < m.tail.length; k++) {
        ctx.globalAlpha = (k / m.tail.length) * 0.9 * Math.max(m.life, 0);
        ctx.fillStyle = "#e3b341";
        ctx.fillRect(m.tail[k].x, m.tail[k].y, 2, 2);
      }
      ctx.globalAlpha = 1;
      if (m.life <= 0 || m.y > H + 30) meteors.splice(j, 1);
    }
    if (!reduced) requestAnimationFrame(step);
  }
  canvas.addEventListener("pointerdown", function (e) {
    var note = document.getElementById("stars-note");
    if (note) note.textContent = "流星划过，愿望实现";
    meteors.push({ x: e.clientX - canvas.getBoundingClientRect().left, y: e.clientY - canvas.getBoundingClientRect().top - 20, vx: 4, vy: 2.6, life: 1, tail: [] });
  });
  var send = document.getElementById("stars-send");
  if (send) send.addEventListener("click", function () {
    var input = document.getElementById("stars-wish");
    var text = (input && input.value.trim()) || "平安喜乐";
    wish(text);
    if (input) input.value = "";
  });
  resize();
  if (reduced) step(0); else requestAnimationFrame(step);
})();
