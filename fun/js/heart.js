/* 跳动爱心：Canvas 粒子组成爱心，随节奏缩放 + 多形态挑选（经典粒子 / 星芒 / 流光圆点） */
(function () {
  "use strict";
  var canvas = document.getElementById("heart-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, pts = [];
  var beat = 1, speed = 0.045;
  var mode = "classic";

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
    var n = mode === "flow" ? 260 : 420;
    var s = Math.min(W, H) / 240;
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      var x, y, size, ph = Math.random() * Math.PI * 2;
      if (mode === "star") {
        // 星芒：爱心轮廓 + 放射状星点
        var spike = Math.random() < 0.35;
        var r = spike ? (0.6 + Math.random() * 0.9) : (0.9 + Math.random() * 0.3);
        x = 16 * Math.pow(Math.sin(t), 3) * r;
        y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * r;
        size = spike ? (1.6 + Math.random() * 1.8) : (1.0 + Math.random() * 0.8);
      } else if (mode === "flow") {
        // 流光圆点：稀疏大点沿心形轨迹流动，带拖尾
        var off = (i * 0.35) % 1;
        x = 16 * Math.pow(Math.sin(t + off), 3);
        y = -(13 * Math.cos(t + off) - 5 * Math.cos(2 * (t + off)) - 2 * Math.cos(3 * (t + off)) - Math.cos(4 * (t + off)));
        size = 2.2 + Math.random() * 2.6;
      } else {
        var jit = 0.9 + Math.random() * 0.5;
        x = 16 * Math.pow(Math.sin(t), 3) * jit;
        y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * jit;
        size = 1.1 + Math.random() * 1.6;
      }
      pts.push({
        x: cx + x * s, y: cy + y * s,
        baseX: cx + x * s, baseY: cy + y * s,
        size: size, ph: ph
      });
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var time = now * 0.001;
    var k = 1 + Math.sin(time * 3.2) * 0.028;
    var cx = W / 2, cy = H / 2 + 8;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var px = cx + (p.x - cx) * k;
      var py = cy + (p.y - cy) * k;
      var tw = Math.sin(time * 2.4 + p.ph);
      ctx.globalAlpha = mode === "flow" ? (0.5 + 0.45 * tw) : (0.55 + 0.35 * tw);
      if (mode === "star") {
        // 星芒四射
        ctx.strokeStyle = "#a3779e";
        ctx.lineWidth = p.size * 0.5;
        var ang = p.ph;
        var len = 5 + tw * 4;
        ctx.beginPath();
        ctx.moveTo(px - Math.cos(ang) * len, py - Math.sin(ang) * len);
        ctx.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
        ctx.stroke();
        ctx.fillStyle = "#e3b341";
        ctx.beginPath();
        ctx.arc(px, py, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      } else if (mode === "flow") {
        ctx.fillStyle = "#e3b341";
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#e07b54";
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(draw);
  }

  function setMode(m) {
    mode = m;
    build();
    var status = document.getElementById("heart-status");
    if (status) status.textContent = m === "classic" ? "经典粒子 · 心跳如初" : m === "star" ? "星芒闪耀 · 爱意发光" : "流光圆点 · 随波流动";
    var picker = document.getElementById("heart-picker");
    if (picker) Array.prototype.forEach.call(picker.querySelectorAll(".btn"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-style") === m);
    });
  }

  canvas.addEventListener("pointerdown", function () { build(); });
  var faster = document.getElementById("heart-faster");
  if (faster) faster.addEventListener("click", function () { speed = Math.min(speed + 0.012, 0.16); });
  var slower = document.getElementById("heart-slower");
  if (slower) slower.addEventListener("click", function () { speed = Math.max(speed - 0.012, 0.01); });
  var picker = document.getElementById("heart-picker");
  if (picker) picker.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-style]") : null;
    if (b) setMode(b.getAttribute("data-style"));
  });
  var status = document.getElementById("heart-status");
  if (status) status.textContent = "爱意在左，节奏随心";

  resize();
  if (reduced) draw(0);
  else requestAnimationFrame(draw);
})();
