/* nocau fun: 激光光束与折射（线段反射演示） */
(function () {
  var cv = document.getElementById("lz-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 820, H = 420;
  cv.width = W * DPR;
  cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  var src = { x: 70, y: H / 2 };
  // 镜面 A/B：每面定义为一个线段，可拖动滑块旋转（绕各自中心）
  function lineBy(cx, cy, angleDeg, len) {
    var rad = angleDeg * Math.PI / 180;
    var dx = Math.cos(rad) * len / 2, dy = Math.sin(rad) * len / 2;
    return { x1: cx - dx, y1: cy - dy, x2: cx + dx, y2: cy + dy };
  }
  var mirrorA = { cx: 360, cy: 300, angle: 45, len: 90 };
  var mirrorB = { cx: 620, cy: 120, angle: 135, len: 90 };
  var inAngle = 0; // 入射角：正=向上偏
  var anim = 0;

  function segs() {
    var A = lineBy(mirrorA.cx, mirrorA.cy, mirrorA.angle, mirrorA.len);
    var B = lineBy(mirrorB.cx, mirrorB.cy, mirrorB.angle, mirrorB.len);
    return [A, B];
  }

  function intersect(p1, p2, p3, p4) {
    var d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
    if (Math.abs(d) < 1e-9) return null;
    var t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
    var u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }

  function reflect(dir, normal) {
    var dot = dir.x * normal.x + dir.y * normal.y;
    return { x: dir.x - 2 * dot * normal.x, y: dir.y - 2 * dot * normal.y };
  }

  function trace() {
    var mirrors = segs();
    var rad = (-inAngle) * Math.PI / 180; // 向上为负角度
    var dir = { x: Math.cos(rad), y: Math.sin(rad) };
    var pt = { x: src.x, y: src.y };
    var pts = [{ x: src.x, y: src.y }];
    var norms = [];
    for (var step = 0; step < 5; step++) {
      var best = null, bestMirror = null, bestU = 0;
      for (var m = 0; m < mirrors.length; m++) {
        var L = mirrors[m];
        var ip = intersect(pt, { x: pt.x + dir.x * 3000, y: pt.y + dir.y * 3000 }, { x: L.x1, y: L.y1 }, { x: L.x2, y: L.y2 });
        if (!ip) continue;
        var d = Math.hypot(ip.x - pt.x, ip.y - pt.y);
        if (d < 1e-3) continue; // 刚从该镜反射离开时，忽略 t≈0 的自命中
        if (!best || d < best.d) { best = { x: ip.x, y: ip.y, d: d, mirror: m, u: ((ip.x - L.x1) * (L.x2 - L.x1) + (ip.y - L.y1) * (L.y2 - L.y1)) / (L.len * L.len) }; }
      }
      // 边界
      var wallHit = null;
      var tLeft = (0 - pt.x) / dir.x, tRight = (W - pt.x) / dir.x, tTop = (0 - pt.y) / dir.y, tBottom = (H - pt.y) / dir.y;
      var candidates = [
        { t: tLeft, pt: { x: 0, y: pt.y + tLeft * dir.y }, n: { x: 1, y: 0 } },
        { t: tRight, pt: { x: W, y: pt.y + tRight * dir.y }, n: { x: -1, y: 0 } },
        { t: tTop, pt: { x: pt.x + tTop * dir.x, y: 0 }, n: { x: 0, y: 1 } },
        { t: tBottom, pt: { x: pt.x + tBottom * dir.x, y: H }, n: { x: 0, y: -1 } }
      ];
      var minB = null;
      for (var c = 0; c < candidates.length; c++) {
        var cand = candidates[c];
        if (cand.t > 1e-4 && (!minB || cand.t < minB.t)) minB = { t: cand.t, pt: cand.pt, n: cand.n };
      }
      var boundT = minB ? minB.t : 3000;
      if (best && best.d < boundT) {
        // 先延到端点，防止镜片端点外的延长线被误判为"在镜面"：
        // 若交点 u 超出 [0,1] 则在 intersect 已排除；此处正常反射
        pts.push(best);
        var Lm = mirrors[best.mirror];
        var segV = { x: Lm.x2 - Lm.x1, y: Lm.y2 - Lm.y1 };
        var normal = { x: -segV.y, y: segV.x };
        var len = Math.hypot(normal.x, normal.y) || 1;
        normal.x /= len; normal.y /= len;
        if (normal.y < 0) { normal.x = -normal.x; normal.y = -normal.y; }
        norms.push(normal);
        dir = reflect(dir, normal);
        pt = best;
      } else {
        pts.push({ x: pt.x + dir.x * boundT, y: pt.y + dir.y * boundT });
        break;
      }
    }
    return { pts: pts, norms: norms };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(4,10,16,0.9)";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(50,90,120,0.3)";
    ctx.lineWidth = 1;
    for (var g = 0; g < W; g += 40) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, H); ctx.stroke(); }
    for (var g2 = 0; g2 < H; g2 += 40) { ctx.beginPath(); ctx.moveTo(0, g2); ctx.lineTo(W, g2); ctx.stroke(); }

    var result = trace();
    var pts = result.pts;
    var lenTotal = 0;
    // 光束（带辉光 + 中心亮线）
    for (var seg = 0; seg < pts.length - 1; seg++) {
      var a = pts[seg], b = pts[seg + 1];
      lenTotal += Math.hypot(b.x - a.x, b.y - a.y);
      ctx.strokeStyle = "rgba(255,60,60,0.18)";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = "rgba(255,120,80,0.5)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = "rgba(255,220,180,0.98)";
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // 镜面
    var mirrors = segs();
    for (var m = 0; m < mirrors.length; m++) {
      var L = mirrors[m];
      ctx.strokeStyle = "rgba(150,210,255,0.9)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(L.x1, L.y1); ctx.lineTo(L.x2, L.y2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "12px sans-serif";
      ctx.fillText(m === 0 ? "镜A" : "镜B", L.x1 + (m === 0 ? -16 : 6), L.y1 + (m === 0 ? 18 : -6));
    }
    // 光源
    ctx.fillStyle = "rgba(255,90,70,0.95)";
    ctx.beginPath(); ctx.arc(src.x, src.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,90,70,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(src.x, src.y, 12 + Math.sin(anim) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(230,235,245,0.95)";
    ctx.font = "13px sans-serif";
    ctx.fillText("激光源", 14, src.y - 18);
    // 终点读数
    var last = pts[pts.length - 1];
    ctx.fillStyle = "rgba(255,150,110,0.95)";
    ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fill();
    var el = document.getElementById("lz-status");
    if (el) el.textContent = "光路长度约 " + Math.round(lenTotal) + "px · 命中点 (" + Math.round(last.x) + ", " + Math.round(last.y) + ") · 折返段 " + (pts.length - 1);
    anim += 0.05;
    requestAnimationFrame(draw);
  }

  document.getElementById("lz-angle").addEventListener("input", function (e) { inAngle = parseFloat(e.target.value); });
  document.getElementById("lz-mirrorA").addEventListener("input", function (e) { mirrorA.angle = parseFloat(e.target.value); });
  document.getElementById("lz-mirrorB").addEventListener("input", function (e) { mirrorB.angle = parseFloat(e.target.value); });
  requestAnimationFrame(draw);
})();
