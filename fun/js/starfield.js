/* nocau fun P000039: 3D 星空投影（Canvas 2D 模拟 3D 旋转，自适应画布，无外部依赖） */
(function () {
  "use strict";
  var canvas = document.getElementById("sf-canvas");
  var ctx = canvas.getContext("2d");
  var stage = document.getElementById("sf-stage");
  var statusEl = document.getElementById("sf-status");
  var W = 0, H = 0, DPR = 1;
  var stars = [], nebulas = [], running = false, raf = 0;
  var rotX = 0.42, rotY = 0.3, auto = true, dragEnabled = true;
  var dragging = false, lastX = 0, lastY = 0, vx = 0, vy = 0;

  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(120, Math.floor(r.width));
    H = Math.max(80, Math.min(560, Math.floor(W * 0.62)));
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    canvas.style.height = H + "px";
  }
  function initScene() {
    stars = [];
    var cnt = 240;
    for (var i = 0; i < cnt; i++) {
      var z = Math.random() * 2 - 1;
      var phi = Math.random() * Math.PI * 2;
      var rr = Math.sqrt(1 - z * z) * (0.72 + Math.random() * 0.28);
      stars.push({
        x: Math.cos(phi) * rr, y: Math.sin(phi) * rr, z: z,
        r: 0.5 + Math.random() * 1.6,
        warm: Math.random() < 0.22,
        tw: Math.random() * Math.PI * 2
      });
    }
    nebulas = [];
    for (var k = 0; k < 6; k++) {
      nebulas.push({
        x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 0.9 + 0.4,
        r: 0.18 + Math.random() * 0.25,
        hue: ["140,170,240", "190,150,230", "220,190,150", "160,200,240"][k % 4],
        a: 0.05 + Math.random() * 0.05
      });
    }
  }
  function dot(px, py, pz) {
    var cz = Math.cos(rotX), sz = Math.sin(rotX);
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var x1 = px * cy - pz * sy;
    var z1 = px * sy + pz * cy;
    var y1 = py * cz - z1 * sz;
    var z2 = py * sz + z1 * cz;
    var persp = 1.4 / (1.6 - z2 * 0.62);
    return { x: W / 2 + x1 * W * 0.34 * persp, y: H / 2 + y1 * H * 0.42 * persp, scale: persp, z: z2 };
  }
  function frame(ts) {
    if (!running) return;
    if (auto && !dragging) {
      rotY += 0.0026;
      rotX = 0.42 + Math.sin(ts * 0.00011) * 0.12;
    }
    ctx.clearRect(0, 0, W, H);
    var base = ctx.createRadialGradient(W / 2, H * 0.44, 0, W / 2, H * 0.44, Math.max(W, H) * 0.85);
    base.addColorStop(0, "#0c1330");
    base.addColorStop(0.55, "#070b1d");
    base.addColorStop(1, "#02030a");
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    var nl = 0;
    for (var n = 0; n < nebulas.length; n++) {
      var nb = nebulas[n];
      var p = dot(nb.x, nb.y, nb.z);
      var nr = nb.r * W * 0.85 * p.scale;
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, nr);
      var wob = 0.8 + 0.2 * Math.sin(ts * 0.0002 + n * 2.1);
      g.addColorStop(0, "rgba(" + nb.hue + "," + (nb.a * wob).toFixed(3) + ")");
      g.addColorStop(0.6, "rgba(" + nb.hue + "," + (nb.a * 0.5 * wob).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + nb.hue + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, nr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var sp = dot(s.x, s.y, s.z);
      if (sp.scale < 0.2) continue;
      var twinkle = 0.7 + 0.3 * Math.sin(ts * (0.001 + s.tw * 0.0004) + i * 0.7);
      var r = Math.max(0.35, s.r * sp.scale * 0.9);
      var col = s.warm ? "255,224,180" : "208,224,255";
      ctx.fillStyle = "rgba(" + col + "," + (0.16 * twinkle).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(" + col + "," + (0.9 * twinkle).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(2,3,10,0)"; ctx.fillRect(0, 0, 0, 0);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    statusEl.textContent = "渲染中 · " + stars.length + " 颗恒星 · 自动旋转" + (auto ? "开" : "关");
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  stage.addEventListener("pointerdown", function (e) {
    if (!dragEnabled) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    rotY += dx * 0.005;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.004));
    vx = dx; vy = dy;
  });
  stage.addEventListener("pointerup", function (e) { dragging = false; });
  stage.addEventListener("pointerleave", function () { dragging = false; });
  document.getElementById("sf-auto").addEventListener("click", function () { auto = true; statusEl.textContent = "自动旋转已开启；拖拽可调整视角。"; });
  document.getElementById("sf-pause").addEventListener("click", function () { auto = false; statusEl.textContent = "已暂停自动旋转，可拖拽查看。"; });
  document.getElementById("sf-drag").addEventListener("change", function (e) { dragEnabled = e.target.checked; });

  resize();
  initScene();
  window.addEventListener("resize", function () { resize(); });
  start();
  window.addEventListener("pagehide", stop);
})();
