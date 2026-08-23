/* 跳动爱心：Canvas 粒子组成爱心，随节奏缩放 */
(function () {
  "use strict";
  var canvas = document.getElementById("heart-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, pts = [];
  var beat = 1, speed = 0.045;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }
  window.addEventListener("resize", resize);

  function build() {
    pts = [];
    var cx = W / 2, cy = H / 2 + 8;
    var n = 420;
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var s = Math.min(W, H) / 240;
      // 心形参数方程
      var x = 16 * Math.pow(Math.sin(t), 3);
      var y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      var jit = 0.9 + Math.random() * 0.5;
      pts.push({
        x: cx + x * s * jit,
        y: cy + y * s * jit,
        baseX: cx + x * s,
        baseY: cy + y * s,
        size: 1.1 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var time = now * 0.001;
    // 心跳缩放
    beat += (Math.sin(time * 3.2) * 0.02 - (beat - 1) * 0.0) * 0.01;
    var k = 1 + Math.sin(time * 3.2) * 0.028;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var px = cx + (p.x - cx) * k;
      var py = cy + (p.y - cy) * k;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 2.4 + p.ph);
      ctx.fillStyle = "#e07b54";
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(draw);
  }

  canvas.addEventListener("pointerdown", function () { build(); });
  var faster = document.getElementById("heart-faster");
  if (faster) faster.addEventListener("click", function () { speed = Math.min(speed + 0.012, 0.16); });
  var slower = document.getElementById("heart-slower");
  if (slower) slower.addEventListener("click", function () { speed = Math.max(speed - 0.012, 0.01); });
  var status = document.getElementById("heart-status");
  if (status) status.textContent = "爱意在左，节奏随心";

  resize();
  if (reduced) draw(0);
  else requestAnimationFrame(draw);
})();
