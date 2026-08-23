/* 烟花：点击/自动绽放，Canvas 粒子，CSP 兼容 */
(function () {
  "use strict";
  var canvas = document.getElementById("fireworks-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr;
  var rockets = [], sparks = [];
  var running = true, autoTimer = null;
  var PALETTE = ["#d8dee9", "#8fa8bd", "#e3b341", "#e07b54", "#a3779e", "#7ba05b"];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function launch(x, y) {
    var rocket = {
      x: x != null ? x : rnd(W * 0.15, W * 0.85),
      y: y != null ? y : H + 10,
      vx: rnd(-0.6, 0.6),
      vy: rnd(-6.5, -4.2),
      targetY: rnd(H * 0.12, H * 0.45),
      color: PALETTE[(Math.random() * PALETTE.length) | 0],
      trail: []
    };
    rockets.push(rocket);
  }

  function burst(x, y, color) {
    var n = 70;
    var baseAngle = Math.random() * Math.PI * 2;
    for (var i = 0; i < n; i++) {
      var angle = baseAngle + (Math.PI * 2 * i) / n;
      var speed = rnd(0.8, 4.6);
      sparks.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, decay: rnd(0.008, 0.02),
        color: color, size: rnd(1, 2.4)
      });
    }
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    // 火箭
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 8) r.trail.shift();
      r.x += r.vx; r.y += r.vy; r.vy += 0.12;
      // 拖尾
      for (var t = 0; t < r.trail.length; t++) {
        ctx.globalAlpha = (t / r.trail.length) * 0.6;
        ctx.fillStyle = r.color;
        ctx.fillRect(r.trail[t].x, r.trail[t].y, 2, 2);
      }
      ctx.globalAlpha = 1;
      if (r.vy >= -0.4 || r.y <= r.targetY) {
        burst(r.x, r.y, r.color);
        rockets.splice(i, 1);
      }
    }
    // 火星
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.x += s.vx; s.y += s.vy;
      s.vx *= 0.985; s.vy *= 0.985; s.vy += 0.03;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(j, 1); continue; }
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * s.life + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(step);
  }

  canvas.addEventListener("pointerdown", function (e) {
    var r = canvas.getBoundingClientRect();
    launch(e.clientX - r.left, e.clientY - r.top);
  });

  var more = document.getElementById("fx-more");
  if (more) more.addEventListener("click", function () { launch(); launch(); });
  var toggle = document.getElementById("fx-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      running = !running;
      toggle.textContent = running ? "暂停" : "继续";
      if (running && reduced) step();
      if (running && !reduced) step();
    });
  }
  var status = document.getElementById("fx-status");
  if (status) status.textContent = "自动绽放中，点击画布手动放烟花";

  function autoLoop() {
    if (!running) { autoTimer = setTimeout(autoLoop, 600); return; }
    launch();
    autoTimer = setTimeout(autoLoop, rnd(700, 1400));
  }
  resize();
  if (reduced) { step(); } else { autoLoop(); step(); }
})();
