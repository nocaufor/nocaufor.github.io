/* nocau Fun PID 闭环控制器仿真（源自想法 C000004，CSP 兼容） */
(function () {
  "use strict";

  var canvas = document.getElementById("pd-canvas");
  var ctx = canvas.getContext("2d");
  var kpEl = document.getElementById("pd-kp");
  var kiEl = document.getElementById("pd-ki");
  var kdEl = document.getElementById("pd-kd");
  var targetEl = document.getElementById("pd-target");
  var runBtn = document.getElementById("pd-run");
  var resetBtn = document.getElementById("pd-reset");
  var statusEl = document.getElementById("pd-status");
  if (!canvas) return;

  var W = canvas.width, H = canvas.height;
  var running = false, timer = null;
  var t = 0;
  var y = 0, integral = 0, prevErr = 0;
  var history = [];
  var Kp = 1.0, Ki = 0.2, Kd = 0.4, target = 60;

  // 一阶惯性对象 + 延迟近似
  function plant(u) {
    return u * 0.02;
  }

  function step(dt) {
    var err = target - y;
    integral += err * dt;
    var der = (err - prevErr) / dt;
    var u = Kp * err + Ki * integral + Kd * der;
    // 限制输出
    if (u > 100) u = 100; if (u < -100) u = -100;
    y += plant(u) * dt * 10 + (y > 0 ? -y * 0.012 * dt : 0); // 一阶近似：dy = (K*u - y)/tau
    y += (u - y) * dt * 0.15;
    prevErr = err;
    history.push(y);
    if (history.length > 2000) history.shift();
    t += dt;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0e0e12";
    ctx.fillRect(0, 0, W, H);
    // 网格
    ctx.strokeStyle = "rgba(255,255,255,.07)";
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 0; gy <= H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    // 目标线
    var ty = H - target / 100 * H;
    ctx.strokeStyle = "#98c379";
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
    ctx.setLineDash([]);
    // 曲线
    if (history.length > 1) {
      ctx.strokeStyle = "#7aa2f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      var stepX = W / Math.max(history.length - 1, 1);
      for (var i = 0; i < history.length; i++) {
        var x = i * stepX;
        var yy = H - Math.max(0, Math.min(history[i], 100)) / 100 * H;
        if (i === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // 状态文字
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.font = "12px Consolas, monospace";
    ctx.fillText("t=" + t.toFixed(1) + "s  y=" + y.toFixed(1) + "  target=" + target, 10, 20);
  }

  function readParams() {
    Kp = parseFloat(kpEl.value) || 0;
    Ki = parseFloat(kiEl.value) || 0;
    Kd = parseFloat(kdEl.value) || 0;
    target = parseFloat(targetEl.value) || 60;
  }

  function reset() {
    readParams();
    t = 0; y = 0; integral = 0; prevErr = 0; history = [];
    statusEl.textContent = "已复位 · Kp=" + Kp + " Ki=" + Ki + " Kd=" + Kd + " 目标=" + target;
    render();
  }

  function loop() {
    if (!running) return;
    for (var k = 0; k < 3; k++) step(0.02);
    render();
  }

  function toggle() {
    if (running) {
      running = false;
      clearInterval(timer);
      runBtn.textContent = "运行 / 暂停";
    } else {
      readParams();
      running = true;
      runBtn.textContent = "运行 / 暂停";
      timer = setInterval(loop, 16);
    }
  }

  runBtn.addEventListener("click", toggle);
  resetBtn.addEventListener("click", reset);
  document.querySelectorAll("[data-preset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = btn.dataset.preset;
      if (p === "P") { kpEl.value = 2.0; kiEl.value = 0; kdEl.value = 0; }
      if (p === "PI") { kpEl.value = 1.2; kiEl.value = 0.35; kdEl.value = 0; }
      if (p === "PID") { kpEl.value = 1.0; kiEl.value = 0.2; kdEl.value = 0.4; }
      if (p === "aggr") { kpEl.value = 3.0; kiEl.value = 0.05; kdEl.value = 1.5; }
      reset();
    });
  });

  reset();
})();
