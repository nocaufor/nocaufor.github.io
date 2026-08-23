/* 孔明灯：写下愿望放飞，缓缓升入夜空 */
(function () {
  "use strict";
  var canvas = document.getElementById("lantern-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, lanterns = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function launch(text) {
    lanterns.push({
      x: W / 2 + (Math.random() * 120 - 60),
      y: H + 30,
      text: text,
      vy: -1.1 - Math.random() * 0.8,
      sway: Math.random() * 6.28,
      r: 26 + Math.random() * 10
    });
  }
  function drawLantern(l, t) {
    l.y += l.vy;
    l.sway += 0.02;
    var x = l.x + Math.sin(l.sway) * 14;
    if (l.y < -90) return false;
    // 光晕
    var g = ctx.createRadialGradient(x, l.y, 2, x, l.y, l.r * 2.6);
    g.addColorStop(0, "rgba(227,179,65,0.22)");
    g.addColorStop(1, "rgba(227,179,65,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, l.y, l.r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    // 灯体
    ctx.fillStyle = "#e3b341";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, l.y - l.r);
    ctx.quadraticCurveTo(x + l.r * 0.8, l.y, x, l.y + l.r * 0.9);
    ctx.quadraticCurveTo(x - l.r * 0.8, l.y, x, l.y - l.r);
    ctx.fill();
    ctx.globalAlpha = 1;
    // 底座与文字
    ctx.strokeStyle = "rgba(60,50,20,0.75)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - l.r * 0.42, l.y + l.r * 0.8);
    ctx.lineTo(x + l.r * 0.42, l.y + l.r * 0.8);
    ctx.stroke();
    ctx.fillStyle = "#5a4a20";
    ctx.font = Math.max(11, l.r * 0.5) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(l.text.slice(0, 6), x, l.y + l.r * 0.45);
    return true;
  }
  function step(t) {
    ctx.clearRect(0, 0, W, H);
    // 背景淡星
    ctx.fillStyle = "#d8dee9";
    for (var i = 0; i < 60; i++) {
      var sx = (i * 97.3) % W, sy = (i * 61.7) % H;
      ctx.globalAlpha = 0.2 + 0.2 * Math.sin(t * 0.001 + i);
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;
    for (var j = lanterns.length - 1; j >= 0; j--) {
      if (!drawLantern(lanterns[j], t)) lanterns.splice(j, 1);
    }
    if (!reduced) requestAnimationFrame(step);
  }
  canvas.addEventListener("pointerdown", function (e) {
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left;
    var y = e.clientY - r.top;
    lanterns.push({ x: x, y: y, text: "愿", vy: -1.2, sway: Math.random() * 6.28, r: 26 });
  });
  var send = document.getElementById("lantern-send");
  if (send) send.addEventListener("click", function () {
    var input = document.getElementById("lantern-wish");
    var text = (input && input.value.trim()) || "万事顺意";
    launch(text);
    if (input) input.value = "";
    var note = document.getElementById("lantern-note");
    if (note) note.textContent = "已放飞：" + text;
  });
  resize();
  if (reduced) step(0); else requestAnimationFrame(step);
})();
