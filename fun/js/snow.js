/* 雪花飘落：Canvas 雪花 */
(function () {
  "use strict";
  var canvas = document.getElementById("snow-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, flakes = [], count = 80, running = true;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeFlakes();
  }
  window.addEventListener("resize", resize);

  function makeFlakes() {
    flakes = [];
    for (var i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 1 + Math.random() * 3.4,
        vy: 0.4 + Math.random() * 1.4,
        vx: -0.5 + Math.random() * 1,
        ph: Math.random() * Math.PI * 2
      });
    }
  }
  function step(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#d8dee9";
    ctx.globalAlpha = 0.9;
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      f.y += f.vy; f.x += f.vx + Math.sin(t * 0.001 + f.ph) * 0.4;
      if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
      if (f.x > W + 6) f.x = -6;
      if (f.x < -6) f.x = W + 6;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(step);
  }
  function setCount(n) {
    count = n;
    makeFlakes();
  }
  canvas.addEventListener("pointerdown", function (e) {
    var r = canvas.getBoundingClientRect();
    for (var i = 0; i < 30; i++) {
      flakes.push({ x: e.clientX - r.left + (Math.random() * 80 - 40), y: e.clientY - r.top, r: 1.5 + Math.random() * 3, vy: 1 + Math.random() * 1.6, vx: -0.8 + Math.random() * 1.6, ph: Math.random() * 6.28 });
    }
  });
  var low = document.getElementById("snow-low");
  var mid = document.getElementById("snow-mid");
  var high = document.getElementById("snow-high");
  function mark(active, a, b, c) {
    [low, mid, high].forEach(function (btn) { if (btn) btn.className = "btn btn-outline"; });
    active.className = "btn btn-primary";
    setCount(a);
  }
  if (low) low.addEventListener("click", function () { mark(low); setCount(30); });
  if (mid) mid.addEventListener("click", function () { mark(mid); setCount(80); });
  if (high) high.addEventListener("click", function () { mark(high); setCount(160); });

  resize();
  if (reduced) step(0); else requestAnimationFrame(step);
})();
