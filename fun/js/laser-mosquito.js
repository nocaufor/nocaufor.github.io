/* laser-mosquito：激光追踪打蚊器模拟（Canvas，CSP 兼容） */
(function () {
  "use strict";
  var canvas = document.getElementById("laser-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr;
  var mosq = [];
  var score = 0, shots = 0;
  var mouse = { x: -100, y: -100 };
  var aimActive = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function spawnMosq(force) {
    if (mosq.length >= 8 && !force) return;
    mosq.push({
      x: 20 + Math.random() * (W - 40),
      y: 20 + Math.random() * (H - 60),
      vx: (Math.random() - 0.5) * 1.4,
      vy: (Math.random() - 0.5) * 1.4,
      r: 4 + Math.random() * 2,
      life: 260 + Math.random() * 120
    });
  }

  function update() {
    for (var i = mosq.length - 1; i >= 0; i--) {
      var m = mosq[i];
      m.x += m.vx; m.y += m.vy;
      if (m.x < 10 || m.x > W - 10) m.vx *= -1;
      if (m.y < 10 || m.y > H - 40) m.vy *= -1;
      m.life--;
      if (m.life <= 0) { mosq.splice(i, 1); spawnMosq(true); }
    }
    if (Math.random() < 0.008) spawnMosq(false);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    // 画布底纹（模拟监控画面）
    ctx.fillStyle = "#0b1118";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(90,140,90,0.28)";
    ctx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // 蚊子
    for (var i = 0; i < mosq.length; i++) {
      var m = mosq[i];
      ctx.fillStyle = "#d9a066";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(220,220,220,0.5)";
      ctx.beginPath();
      ctx.moveTo(m.x - m.r - 3, m.y);
      ctx.lineTo(m.x + m.r + 3, m.y);
      ctx.stroke();
    }

    // 瞄准辅助线（鼠标方向）
    if (aimActive && !reduced) {
      ctx.strokeStyle = "rgba(231,76,60,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(mouse.x, mouse.y - 60);
      ctx.lineTo(mouse.x, mouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!reduced) requestAnimationFrame(draw);
  }

  function fire() {
    shots++;
    var hit = -1;
    for (var i = 0; i < mosq.length; i++) {
      var m = mosq[i];
      var dx = m.x - mouse.x, dy = m.y - mouse.y;
      if (dx * dx + dy * dy < 32 * 32) { hit = i; break; }
    }
    // 激光束特效
    var beam = document.createElement("div");
    beam.setAttribute("aria-hidden", "true");
    beam.style.cssText = "position:absolute;left:" + mouse.x + "px;top:" + mouse.y + "px;width:120px;height:2px;background:linear-gradient(90deg,rgba(255,60,60,0.95),transparent);transform-origin:left center;border-radius:2px;pointer-events:none;z-index:2;animation:confetti-fall 0.35s linear forwards;opacity:0";
    canvas.parentNode.appendChild(beam);
    setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }, 400);

    if (hit !== -1) {
      score++;
      mosq.splice(hit, 1);
      spawnMosq(true);
    }
    updateStat();
  }

  function updateStat() {
    var el = document.getElementById("laser-stat");
    if (el) el.textContent = "命中 " + score + " / 发射 " + shots;
  }

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    aimActive = true;
  });
  canvas.addEventListener("mouseleave", function () { aimActive = false; });
  canvas.addEventListener("click", fire);
  canvas.addEventListener("pointerdown", function (e) { if (e.pointerType === "touch") fire(); });

  resize();
  spawnMosq(true);
  spawnMosq(true);
  updateStat();
  if (reduced) draw(0);
  else requestAnimationFrame(draw);
})();
