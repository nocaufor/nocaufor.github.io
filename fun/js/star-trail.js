/* star-trail：星轨涂鸦（Canvas 粒子，CSP 兼容） */
(function () {
  "use strict";
  var stage = document.getElementById("st-stage");
  var canvas = document.getElementById("st-canvas");
  var ctx = canvas.getContext("2d");
  var clearBtn = document.getElementById("st-clear");
  var modeBtn = document.getElementById("st-mode");

  var parts = [];
  var drawing = false;
  var hue = 0;
  var glowMode = false;
  var W = 0, H = 0;

  function resize() {
    var r = stage.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    W = canvas.width = Math.max(320, Math.floor(r.width * dpr));
    H = canvas.height = 340 * dpr;
    canvas.style.height = "340px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getPos(e) {
    var r = stage.getBoundingClientRect();
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function paint(x, y) {
    var n = glowMode ? 6 : 3;
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.8,
        vy: (Math.random() - 0.5) * 1.8,
        life: 1,
        hue: (hue + Math.random() * 50) % 360
      });
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.98; p.vy *= 0.98;
      p.life -= 0.016;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (glowMode) {
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10);
        g.addColorStop(0, "hsla(" + p.hue + ", 85%, 65%, " + Math.max(0, p.life * 0.5) + ")");
        g.addColorStop(1, "hsla(" + p.hue + ", 85%, 65%, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "hsla(" + p.hue + ", 80%, 62%, " + Math.max(0, p.life) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6 * p.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    hue = (hue + 0.6) % 360;
    requestAnimationFrame(step);
  }

  stage.addEventListener("mousedown", function (e) { drawing = true; paint(getPos(e).x, getPos(e).y); });
  window.addEventListener("mousemove", function (e) {
    if (!drawing) return;
    var p = getPos(e);
    paint(p.x, p.y);
  });
  window.addEventListener("mouseup", function () { drawing = false; });
  stage.addEventListener("touchstart", function (e) {
    e.preventDefault();
    drawing = true;
    var p = getPos(e);
    paint(p.x, p.y);
  }, { passive: false });
  stage.addEventListener("touchmove", function (e) {
    e.preventDefault();
    if (!drawing) return;
    var p = getPos(e);
    paint(p.x, p.y);
  }, { passive: false });
  stage.addEventListener("touchend", function () { drawing = false; });

  clearBtn.addEventListener("click", function () {
    parts = [];
    ctx.clearRect(0, 0, W, H);
  });
  modeBtn.addEventListener("click", function () {
    glowMode = !glowMode;
    modeBtn.textContent = glowMode ? "模式：辉光" : "模式：星轨";
  });

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
})();
