/* nocau fun: 雷达扫描 */
(function () {
  var cv = document.getElementById("rd-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 520, H = 520, CX = W / 2, CY = H / 2, RMAX = W / 2 - 16;
  cv.width = W * DPR;
  cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var angle = 0;
  var blips = []; // {a(angle deg), d(0..1), fade}
  var trail = [];

  function buildBlips(n) {
    var next = [];
    for (var i = 0; i < n; i++) {
      var duplicate = false;
      for (var j = 0; j < next.length; j++) {
        if (Math.abs(next[j].a - ((i * 137.5 + 17) % 360)) < 6) { duplicate = true; break; }
      }
      var a = ((i * 137.5 + (duplicate ? 29 : 17)) % 360) * Math.PI / 180;
      var d = 0.18 + ((i * 47) % 78) / 100;
      next.push({ a: a, d: d });
    }
    return next;
  }
  var targets = buildBlips(6);
  var targetCount = 6;
  var speed = 1.4;
  var angleEl = document.getElementById("rd-angle");
  var contactEl = document.getElementById("rd-contact");

  document.getElementById("rd-speed").addEventListener("input", function (e) { speed = parseFloat(e.target.value); });
  document.getElementById("rd-count").addEventListener("input", function (e) {
    targetCount = Math.max(1, Math.min(15, parseInt(e.target.value, 10) || 1));
    targets = buildBlips(targetCount);
  });

  function drawRings() {
    ctx.clearRect(0, 0, W, H);
    var grad = ctx.createRadialGradient(CX, CY, 8, CX, CY, RMAX);
    grad.addColorStop(0, "rgba(8,26,32,0.25)");
    grad.addColorStop(1, "rgba(4,18,22,0.9)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(CX, CY, RMAX, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(70,220,150,0.16)";
    ctx.lineWidth = 1;
    for (var r = 1; r <= 5; r++) {
      ctx.beginPath();
      ctx.arc(CX, CY, (RMAX / 5) * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (var i = 0; i < 360; i += 30) {
      var x = CX + RMAX * Math.cos(i * Math.PI / 180);
      var y = CY + RMAX * Math.sin(i * Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function fadeTrail() {
    for (var i = trail.length - 1; i >= 0; i--) {
      trail[i].life -= 0.045;
      if (trail[i].life <= 0) trail.splice(i, 1);
    }
  }

  function inSector(b, aRad) {
    var diff = Math.abs(((b.a * 180 / Math.PI) - (aRad * 180 / Math.PI) + 540) % 360 - 180);
    return diff < 2.2;
  }

  function tick(ts) {
    drawRings();
    fadeTrail();
    var aRad = angle * Math.PI / 180;
    // echo blips: base dot + glow near sweep
    var nearest = null, nearestD = 1e9;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var hit = inSector(t, aRad);
      var rr = t.d * RMAX;
      var px = CX + rr * Math.sin(t.a);
      var py = CY - rr * Math.cos(t.a);
      if (hit) {
        if (t.d < nearestD) { nearestD = t.d; nearest = t; }
        trail.push({ x: px, y: py, r: 5, life: 1 });
      }
      ctx.fillStyle = hit ? "rgba(120,255,190,0.95)" : "rgba(120,255,190,0.32)";
      ctx.beginPath();
      ctx.arc(px, py, hit ? 4 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (var k = 0; k < trail.length; k++) {
      var tr = trail[k];
      ctx.fillStyle = "rgba(110,255,185," + (tr.life * 0.5).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.r * tr.life + 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // sweep line
    var sx = CX + RMAX * Math.sin(aRad);
    var sy = CY - RMAX * Math.cos(aRad);
    var lgrad = ctx.createLinearGradient(CX, CY, sx, sy);
    lgrad.addColorStop(0, "rgba(70,255,170,0)");
    lgrad.addColorStop(1, "rgba(70,255,170,0.95)");
    ctx.strokeStyle = lgrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    // sweep wedge
    ctx.fillStyle = "rgba(80,255,175,0.05)";
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, RMAX, aRad - 0.55, aRad);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(90,240,170,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, Math.PI * 2);
    ctx.stroke();

    if (angleEl) angleEl.textContent = "扫描角 " + Math.round(angle % 360) + "°";
    if (contactEl) {
      if (nearest) contactEl.textContent = "最近目标 距离 " + Math.round(nearest.d * 100) + " · 方位 " + Math.round(nearest.a * 180 / Math.PI) + "°";
      else contactEl.textContent = "最近目标 无";
    }
    angle = (angle + speed) % 360;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
