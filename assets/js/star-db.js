/* ============================================================
   nocau · 星空数据库引擎 v2（star-db 独立展示页 · 纯星空重构版）
   - 全量星星渲染（不再裁剪 40 颗上限）
   - 移除卡片列表视图与切换入口，仅保留 3D 星空主体
   - 支持按类别筛选（娱乐/功能/实用代码、想法方案、作品）
   - 支持关键词搜索定位（匹配编号/名称/简介/类型）
   - 方案/策划详情以星星承载：点击星星触发粒子散射动画展开详情浮层，关闭时粒子回收
   - 页面加载播放宇宙大爆炸转场；排序驱动星空分布重排
   纯原生 Canvas 2D：旋转矩阵 + 透视投影 + 深度排序
   约束：CSP script-src 'self'、无内联、无外部库
   ============================================================ */
(function () {
  "use strict";

  var section = document.getElementById("sec-stars");
  var canvas = document.getElementById("stars-canvas");
  if (!section || !canvas) return;

  var RATING_KEY = "nocau-star-rating";
  var LANG_KEY = "nocau-lang";
  var panel = document.getElementById("star-panel");
  var mask = document.getElementById("star-panel-mask");
  var elCode = document.getElementById("star-code");
  var elName = document.getElementById("star-name");
  var elDesc = document.getElementById("star-desc");
  var elType = document.getElementById("star-type");
  var elLike = document.getElementById("star-like");
  var elDislike = document.getElementById("star-dislike");
  var elClose = document.getElementById("star-close");
  var elLink = document.getElementById("star-link");
  var elLink2 = document.getElementById("star-link2");

  var ctx = canvas.getContext("2d");
  var _allStars = (window.NOCAU_STARS || []).slice();
  var stars = _allStars.slice();
  /* 筛选状态：all=全部  ent=娱乐代码(E) func=功能代码(F) dev=实用代码(P) idea=想法方案(B/C) */
  var activeFilter = "all";
  var searchQuery = "";
  var sortBy = "code-asc";
  var empty3d = document.getElementById("star-db-empty-3d");
  var countEl = document.getElementById("star-db-count");
  var elSize = document.getElementById("star-size");
  var filterTexts = {};
  var filterGroups = {
    ent: ["E"], func: ["F"], dev: ["P"], idea: ["B", "C"]
  };
  function matchSearch(st) {
    if (!searchQuery) return true;
    var hay = [st.code || "", st.name.zh || "", st.name.en || "", st.desc.zh || "", st.desc.en || "", st.type.zh || "", st.type.en || ""].join(" ").toLowerCase();
    return hay.indexOf(searchQuery) !== -1;
  }
  function isVisible(st) {
    if (!st) return false;
    if (activeFilter === "all" && !searchQuery) return true;
    var g = (st.code || "").charAt(0);
    var list = filterGroups[activeFilter] || [];
    if (activeFilter !== "all") {
      var ok = false;
      for (var i = 0; i < list.length; i++) if (g === list[i]) { ok = true; break; }
      if (!ok) return false;
    }
    return matchSearch(st);
  }
  var N = stars.length;
  if (!N) return;

  var W = 0, H = 0, DPR = 1, bgCanvas = null, bgPad = 0;
  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- 3D 状态 ---------- */
  var FOV = 4.4, VIEW_DIST = 6.0, RADIUS = 3.0;
  var rotationX = 0.46, rotationY = -0.55;
  var velX = 0, velY = 0, drag = null, moved = false, downT = 0;
  var zoom = 1, targetZoom = 1;
  var currentStar = null, hoverStar = null, lastAutoTime = 0;
  var pendingOpenTimer = null;
  var autoRotate = !reduced;
  var interacting = false;
  var rafId = 0, running = false, lastTs = 0;

  /* ---------- 粒子散射（星星详情展开/回收） ---------- */
  var pLayer = document.getElementById("star-particle-layer");
  var pCtx = pLayer ? pLayer.getContext("2d") : null;
  var pW = 0, pH = 0, pDPR = 1;
  var particles = [];
  var particleAnim = null;
  var animLoopOn = false;

  /* ---------- 评分（localStorage 持久化） ---------- */
  var rating = {};
  try { rating = JSON.parse(localStorage.getItem(RATING_KEY) || "{}") || {}; } catch (e) { rating = {}; }
  function saveRating() {
    try { localStorage.setItem(RATING_KEY, JSON.stringify(rating)); } catch (e) {}
  }

  /* ---------- 工具 ---------- */
  function getLang() {
    try { return (document.documentElement.lang || "zh").indexOf("en") === 0 ? "en" : "zh"; } catch (e) { return "zh"; }
  }
  function L(zh, en) { return getLang() === "en" ? en : zh; }
  function frac(v) { return v - Math.floor(v); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  /* 缓动：0..1 的 ease-in-out */
  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /* ---------- 星星数据构建：真实星空分布（球面泊松盘 + 密度分层 + 噪声扰动） ----------
     银道面附近更密、两极更疏，星点大小错落/明暗不一，避免均匀或聚集；分布确定性（刷新不变） */
  function detRand(s) { return frac(Math.sin(s * 12.9898 + 78.233) * 43758.5453); }
  function densityAt(p) {
    var band = Math.max(0, 1 - Math.abs(p.y) / 0.62);
    var noise = 0.55 + 0.45 * frac(Math.sin(p.x * 31.7 + p.y * 47.3 + p.z * 61.9) * 43758.5453);
    return clamp(0.18 + band * 0.58 * noise, 0.16, 0.98);
  }
  function makeStarDistribution(n) {
    var cands = [];
    var total = Math.max(900, n * 18);
    for (var i = 0; i < total; i++) {
      var u = detRand(i), v = detRand(i + 5000);
      var phi = u * Math.PI * 2;
      var cosT = 2 * v - 1;
      var sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
      cands.push({ x: sinT * Math.cos(phi), y: cosT, z: sinT * Math.sin(phi) });
    }
    for (var i = cands.length - 1; i > 0; i--) {
      var j = Math.floor(detRand(i + 9000) * (i + 1));
      var t = cands[i]; cands[i] = cands[j]; cands[j] = t;
    }
    var sel = [];
    var minAng = 0.24;
    for (var k = 0; k < cands.length && sel.length < n; k++) {
      var c = cands[k];
      if (detRand(k + 13000) > densityAt(c)) continue;
      var ok = true;
      for (var m = 0; m < sel.length; m++) {
        var d = Math.acos(Math.max(-1, Math.min(1, c.x * sel[m].x + c.y * sel[m].y + c.z * sel[m].z)));
        if (d < minAng) { ok = false; break; }
      }
      if (ok) sel.push(c);
    }
    if (sel.length < n) {
      for (var k2 = 0; k2 < cands.length && sel.length < n; k2++) {
        var c2 = cands[k2];
        if (sel.indexOf(c2) !== -1) continue;
        var ok2 = true;
        for (var m2 = 0; m2 < sel.length; m2++) {
          var d2 = Math.acos(Math.max(-1, Math.min(1, c2.x * sel[m2].x + c2.y * sel[m2].y + c2.z * sel[m2].z)));
          if (d2 < 0.16) { ok2 = false; break; }
        }
        if (ok2) sel.push(c2);
      }
    }
    var out = [];
    for (var s = 0; s < Math.min(n, sel.length); s++) {
      var sp = sel[s];
      var nzX = Math.sin(sp.y * 12.9 + sp.z * 5.1) * 0.5 + Math.sin(sp.z * 17.3 + sp.x * 7.7) * 0.3;
      var nzY = Math.sin(sp.x * 11.7 + sp.z * 6.3) * 0.5 + Math.sin(sp.z * 15.1 + sp.y * 8.9) * 0.3;
      var nzZ = Math.sin(sp.y * 13.1 + sp.x * 4.9) * 0.5 + Math.sin(sp.x * 16.7 + sp.z * 9.3) * 0.3;
      var rScale = 0.5 + 0.5 * frac(Math.sin(s * 127.1 + 311.7) * 43758.5453);
      out.push({
        x: (sp.x + nzX * 0.07) * rScale,
        y: (sp.y + nzY * 0.07) * rScale,
        z: (sp.z + nzZ * 0.07) * rScale
      });
    }
    return out;
  }
  var dist = makeStarDistribution(N);
  var pts = [];
  for (var i = 0; i < N; i++) {
    var dpos = dist[i % dist.length];
    var p = {
      x: dpos.x,
      y: dpos.y,
      z: dpos.z,
      heat: clamp(stars[i].heat || 3, 1, 5),
      size: clamp(stars[i].size || 3, 1, 10),
      phase: frac(Math.sin(i * 12.9898 + 78.233) * 43758.5453) * Math.PI * 2,
      twSpeed: 0.8 + frac(Math.sin(i * 39.12 + 4.7) * 43758.5453) * 1.6,
      breathAmp: 0.10 + frac(Math.sin(i * 91.7 + 13.3) * 43758.5453) * 0.16,
      breathSpeed: 0.00028 + frac(Math.sin(i * 77.3 + 51.1) * 43758.5453) * 0.00052,
      breathPhase: frac(Math.sin(i * 123.9 + 7.7) * 43758.5453) * Math.PI * 2,
      st: stars[i]
    };
    pts.push(p);
  }

  /* ---------- 星座系统：同组星（按 code 首字母分组）连成星座折线链 ----------
     组内按 3D 距离最近邻成链（编号最小者为起点），避免长斜跳线；随 3D 投影联动 */
  var constGroups = [];
  function numOf(st) {
    var m = String(st && (st.code || st.id) || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }
  function dist3sq(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz;
  }
  function buildConstellations() {
    constGroups = [];
    var map = {};
    for (var i = 0; i < N; i++) {
      var g = (pts[i].st.code || "B").charAt(0);
      if (!map[g]) map[g] = [];
      map[g].push(i);
    }
    var keys = Object.keys(map).sort();
    for (var k = 0; k < keys.length; k++) {
      var ids = map[keys[k]];
      if (ids.length < 2) continue;
      ids.sort(function (a, b) { return numOf(pts[a].st) - numOf(pts[b].st); });
      var chain = [ids[0]];
      var used = {};
      used[ids[0]] = true;
      var cur = ids[0];
      while (chain.length < ids.length) {
        var bi = -1, bd = 1e9;
        for (var m = 0; m < ids.length; m++) {
          if (used[ids[m]]) continue;
          var d2 = dist3sq(pts[cur], pts[ids[m]]);
          if (d2 < bd) { bd = d2; bi = ids[m]; }
        }
        if (bi < 0) break;
        used[bi] = true;
        chain.push(bi);
        cur = bi;
      }
      if (chain.length >= 2) constGroups.push(chain);
    }
  }
  function groupOfId(id) {
    return id ? String(id).charAt(0) : null;
  }
  buildConstellations();

  /* ---------- 预渲染光晕 sprite ---------- */
  function makeGlow(size, colorStops) {
    var c = document.createElement("canvas");
    c.width = c.height = size;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (var i = 0; i < colorStops.length; i++) grad.addColorStop(colorStops[i][0], colorStops[i][1]);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }
  var glowSprite = makeGlow(128, [
    [0, "rgba(205, 216, 238, 0.55)"], [0.25, "rgba(150, 168, 210, 0.22)"],
    [0.6, "rgba(96, 118, 170, 0.07)"], [1, "rgba(70, 92, 140, 0)"]
  ]);
  var coreSprite = makeGlow(64, [
    [0, "rgba(255, 255, 255, 0.95)"], [0.3, "rgba(214, 226, 248, 0.5)"],
    [0.7, "rgba(150, 175, 220, 0.12)"], [1, "rgba(120, 150, 200, 0)"]
  ]);

  /* ---------- 伪随机（背景预渲染用） ---------- */
  var RAND_SEED = 20260825;
  function rand() {
    RAND_SEED = (RAND_SEED * 16807) % 2147483647;
    return (RAND_SEED - 1) / 2147483646;
  }
  function rand2() { return Math.random(); }

  /* ---------- 渐变夜空背景（预渲染离屏，带视差；深蓝紫多层渐变 + 星云 + 银河 + 星点） ---------- */
  function buildBg(w, h) {
    RAND_SEED = 20260825;
    var pad = Math.round(Math.max(w, h) * 0.08);
    bgPad = pad;
    var bw = Math.round((w + pad * 2) * DPR), bh = Math.round((h + pad * 2) * DPR);
    var c = document.createElement("canvas");
    c.width = bw; c.height = bh;
    var g = c.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    var W2 = w + pad * 2, H2 = h + pad * 2;

    /* 1) 深空基色：径向渐变中心略亮、四角近黑（深蓝→近黑，静谧低对比） */
    var base = g.createRadialGradient(W2 * 0.5, H2 * 0.46, 0, W2 * 0.5, H2 * 0.46, Math.max(W2, H2) * 0.85);
    base.addColorStop(0, "#10183a");
    base.addColorStop(0.34, "#0a1030");
    base.addColorStop(0.62, "#060a20");
    base.addColorStop(0.85, "#03050f");
    base.addColorStop(1, "#020308");
    g.fillStyle = base;
    g.fillRect(0, 0, W2, H2);
    /* 对角微光：左上微亮，增强对角流动（极低对比） */
    var diag = g.createLinearGradient(0, 0, W2, H2);
    diag.addColorStop(0, "rgba(36, 54, 110, 0.15)");
    diag.addColorStop(0.5, "rgba(18, 28, 66, 0.05)");
    diag.addColorStop(1, "rgba(2, 3, 8, 0)");
    g.fillStyle = diag;
    g.fillRect(0, 0, W2, H2);

    /* 2) 大尺度星云色斑（紫/蓝混合，柔和层次） */
    var nebColors = ["#1c2c5e", "#18264f", "#22335f", "#162446", "#1d2c55", "#18264e", "#141f3f"];
    for (var n = 0; n < 8; n++) {
      var nx = W2 * (0.25 + rand() * 0.5), ny = H2 * (0.3 + rand() * 0.45);
      var nr = Math.max(W2, H2) * (0.16 + rand() * 0.20);
      var ng = g.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, hexA(nebColors[n % nebColors.length], 0.10 + rand() * 0.07));
      ng.addColorStop(1, hexA(nebColors[n % nebColors.length], 0));
      g.fillStyle = ng;
      g.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }

    /* 3) 倾斜椭圆光带（盘状星系/尘埃带）：主带横贯 + 极弱辅带，边缘柔滑模糊 */
    var cx = W2 * 0.5, cy = H2 * 0.5;
    var bandW = Math.max(W2, H2) * 1.05, bandH = Math.max(W2, H2) * 0.20;
    drawBand(g, cx, cy - Math.max(W2, H2) * 0.02, bandW, bandH, -0.50, [[0, "rgba(148, 172, 218, 0.16)"], [0.35, "rgba(120, 146, 198, 0.10)"], [0.7, "rgba(96, 120, 176, 0.05)"], [1, "rgba(90, 114, 170, 0)"]], W2, H2);
    drawBand(g, cx + Math.max(W2, H2) * 0.04, cy + Math.max(W2, H2) * 0.06, bandW * 0.72, bandH * 0.5, -0.50, [[0, "rgba(176, 194, 232, 0.07)"], [0.6, "rgba(150, 170, 214, 0.03)"], [1, "rgba(140, 160, 206, 0)"]], W2, H2);

    /* 4) 银河带内亮星点（更密、更亮，仍低饱和） */
    for (var s = 0; s < 110; s++) {
      var t = rand();
      var sx = cx + Math.cos(-0.42) * (t - 0.5) * bandW * 2 - Math.sin(-0.42) * (rand() - 0.5) * bandH * 3;
      var sy = cy + Math.sin(-0.42) * (t - 0.5) * bandW * 2 + Math.cos(-0.42) * (rand() - 0.5) * bandH * 3;
      var sr = 0.6 + rand() * 1.2;
      g.globalAlpha = 0.22 + rand() * 0.38;
      g.fillStyle = rand() > 0.75 ? "#d5e0f8" : "#b3c2e2";
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    }

    /* 5) 远景星点（两层疏密：近远景可辨 + 远远景微光，低饱和不刺眼） */
    g.globalAlpha = 1;
    for (var d = 0; d < 260; d++) {
      var dx = rand() * W2, dy = rand() * H2;
      var dr = 0.7 + rand() * 1.2;
      g.globalAlpha = 0.30 + rand() * 0.42;
      var rc = rand();
      g.fillStyle = rc > 0.92 ? "#e8d9c8" : (rc > 0.8 ? "#e6ecfb" : "#b7c4e0");
      g.beginPath(); g.arc(dx, dy, dr, 0, Math.PI * 2); g.fill();
    }
    for (var d2 = 0; d2 < 220; d2++) {
      var dx2 = rand() * W2, dy2 = rand() * H2;
      var dr2 = 0.5 + rand() * 0.7;
      g.globalAlpha = 0.15 + rand() * 0.20;
      var rc2 = rand();
      g.fillStyle = rc2 > 0.9 ? "#cfd9ef" : (rc2 > 0.72 ? "#a9b8d8" : "#8d9cc0");
      g.beginPath(); g.arc(dx2, dy2, dr2, 0, Math.PI * 2); g.fill();
    }

    /* 6) 中心视觉焦点：微小星团（密度不均的细白点簇） */
    var focX = W2 * 0.5, focY = H2 * 0.46;
    for (var cl = 0; cl < 26; cl++) {
      var ca = rand() * Math.PI * 2;
      var cd = Math.pow(rand(), 1.6) * Math.max(W2, H2) * 0.045;
      var cxx = focX + Math.cos(ca) * cd;
      var cyy = focY + Math.sin(ca) * cd * 0.7;
      var crr = 0.3 + rand() * 0.55;
      g.globalAlpha = 0.28 + rand() * 0.4;
      g.fillStyle = rand() > 0.8 ? "#e4ecfc" : "#c6d2ee";
      g.beginPath(); g.arc(cxx, cyy, crr, 0, Math.PI * 2); g.fill();
    }
    /* 十字光效星体：中心亮核 + 四向细射线 + 斜向次射线 + 柔光晕（低饱和） */
    var crossColors = ["rgba(216, 228, 252, 0.75)", "rgba(170, 190, 232, 0.5)"];
    for (var xc = 0; xc < 2; xc++) {
      var sxp = focX + (xc === 0 ? 0 : Math.max(W2, H2) * 0.055);
      var syp = focY + (xc === 0 ? 0 : -Math.max(W2, H2) * 0.038);
      var len = Math.max(W2, H2) * (xc === 0 ? 0.028 : 0.018);
      var arm = len * 0.34;
      g.globalAlpha = xc === 0 ? 0.5 : 0.34;
      g.strokeStyle = crossColors[xc];
      g.lineWidth = 1;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(sxp - arm, syp); g.lineTo(sxp + arm, syp);
      g.moveTo(sxp, syp - arm); g.lineTo(sxp, syp + arm);
      g.stroke();
      g.globalAlpha = xc === 0 ? 0.26 : 0.18;
      g.beginPath();
      g.moveTo(sxp - arm * 0.55, syp - arm * 0.55); g.lineTo(sxp + arm * 0.55, syp + arm * 0.55);
      g.moveTo(sxp - arm * 0.55, syp + arm * 0.55); g.lineTo(sxp + arm * 0.55, syp - arm * 0.55);
      g.stroke();
      g.globalAlpha = xc === 0 ? 0.85 : 0.6;
      g.fillStyle = "#eef3ff";
      g.beginPath(); g.arc(sxp, syp, xc === 0 ? 1.5 : 1.0, 0, Math.PI * 2); g.fill();
      g.globalAlpha = xc === 0 ? 0.16 : 0.10;
      g.fillStyle = "rgba(200, 216, 248, 1)";
      g.beginPath(); g.arc(sxp, syp, len * 1.6, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    return c;
  }
  function drawBand(g, cx, cy, bw, bh, rot, stops, w, h) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    var grad = g.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    for (var i = 0; i < stops.length; i++) grad.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function hexA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return "rgba(" + r + "," + gg + "," + b + "," + a.toFixed(3) + ")";
  }

  /* ---------- 流动发散渐变光（动态背景光效：光晕从中心缓慢流动、向外发散，呼吸脉动） ---------- */
  var flowGlows = [];
  function initFlowGlows() {
    flowGlows = [];
    var count = reduced ? 0 : 4;
    for (var i = 0; i < count; i++) {
      flowGlows.push({
        baseAngle: (i / count) * Math.PI * 2 + 0.6,
        speed: 0.024 + detRand(i + 21000) * 0.030,
        t: detRand(i + 22000) * 1.3,
        radius: 0.20 + detRand(i + 23000) * 0.20,
        hue: i % 2 === 0 ? "148,166,228" : "170,142,222",
        alpha: 0.045 + detRand(i + 24000) * 0.055,
        pulse: 0.5 + detRand(i + 25000),
        pulseSpeed: 0.00040 + detRand(i + 26000) * 0.00055
      });
    }
  }
  function drawFlowGlow(ts) {
    if (reduced || !flowGlows.length) return;
    var cx = W / 2, cy = H / 2;
    var R = Math.max(W, H);
    for (var i = 0; i < flowGlows.length; i++) {
      var f = flowGlows[i];
      f.t += f.speed * 0.016;
      if (f.t > 1.32) f.t -= 1.42;
      var ang = f.baseAngle + Math.sin(f.t * 2.2 + i * 1.7) * 0.55;
      var rad = f.t * R * 0.9;
      var x = cx + Math.cos(ang) * rad;
      var y = cy + Math.sin(ang) * rad;
      var fade = Math.sin(f.t * Math.PI);
      if (fade <= 0.02) continue;
      var pr = R * (f.radius + 0.05 * Math.sin(ts * f.pulseSpeed + f.pulse));
      var g = ctx.createRadialGradient(x, y, 0, x, y, pr);
      g.addColorStop(0, "rgba(" + f.hue + "," + (f.alpha * fade).toFixed(3) + ")");
      g.addColorStop(0.55, "rgba(" + f.hue + "," + (f.alpha * fade * 0.42).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + f.hue + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - pr, y - pr, pr * 2, pr * 2);
    }
  }

  /* ---------- 流动渐变背景：中心随时间缓慢漂移的低饱和渐变，柔和持续 ---------- */
  function drawFlowBg(ts) {
    if (reduced) return;
    var cx = W / 2 + Math.sin(ts * 0.00012) * W * 0.20;
    var cy = H / 2 + Math.cos(ts * 0.00009) * H * 0.16;
    var R = Math.max(W, H) * 1.05;
    var t1 = (Math.sin(ts * 0.000085) + 1) / 2;
    var t2 = (Math.cos(ts * 0.000072) + 1) / 2;
    var r1 = Math.round(40 + t1 * 14);
    var g1 = Math.round(52 + t2 * 16);
    var b1 = Math.round(98 + t1 * 20);
    var g0 = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g0.addColorStop(0, "rgba(" + r1 + "," + g1 + "," + b1 + "," + (0.11 + 0.04 * t1).toFixed(3) + ")");
    g0.addColorStop(0.42, "rgba(" + Math.round(r1 * 0.7) + "," + Math.round(g1 * 0.7) + "," + Math.round(b1 * 0.7) + ",0.05)");
    g0.addColorStop(1, "rgba(18,22,44,0)");
    ctx.fillStyle = g0;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- 星系带：沿银道面的柔光星云带，多层 radial 渐变柔边，跟随旋转缓慢漂移 ---------- */
  function drawGalaxyBand(ts) {
    if (reduced) return;
    var tilt = -0.52 + Math.sin(rotationY * 0.4) * 0.10 + Math.cos(ts * 0.00005) * 0.03;
    var cx = W / 2 + Math.cos(ts * 0.00006) * W * 0.015;
    var cy = H / 2 + Math.sin(ts * 0.00005) * H * 0.012;
    var w = Math.max(W, H) * 1.45;
    var h = Math.max(W, H) * 0.19;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    var n = 8;
    for (var i = 0; i < n; i++) {
      var fx = (i / (n - 1) - 0.5) * w;
      var pr = w * 0.13;
      var alpha = 0.045 + 0.04 * Math.sin(ts * 0.00008 + i * 1.6);
      if (alpha <= 0.008) continue;
      var g = ctx.createRadialGradient(fx, 0, 0, fx, 0, pr);
      g.addColorStop(0, "rgba(128,150,204," + alpha.toFixed(3) + ")");
      g.addColorStop(0.5, "rgba(120,142,196," + (alpha * 0.5).toFixed(3) + ")");
      g.addColorStop(1, "rgba(112,134,190,0)");
      ctx.fillStyle = g;
      ctx.fillRect(fx - pr, -h * 1.7, pr * 2, h * 3.4);
    }
    ctx.restore();
  }

  /* ---------- 宇宙大爆炸转场（下滑进入星空时播放一次） ----------
     中心一点炸开：主光球 + 亮度脉冲 + 双层扩张波环 + 星尘喷涌（带湍流漂移），
     星星随后从中心向外"生长/迸发"到各自位置，更宏大更连贯 */
  var burst = null;
  /* 转场触发节流：每次下滑进入都可靠播放，间隔内不重复触发 */
  var burstLastAt = 0;
  function triggerLightBurst(force) {
    var now = performance.now();
    if (!force && now - burstLastAt < 2400) return;
    burstLastAt = now;
    if (reduced) {
      /* 降级：柔光淡入 */
      section.classList.add("light-burst-fade");
      setTimeout(function () { section.classList.remove("light-burst-fade"); }, 1100);
      return;
    }
    section.classList.add("light-burst");
    burst = { dur: 2100, start: performance.now(), parts: [], rings: [] };
    var bx = W / 2, by = H / 2;
    /* 星尘喷涌：更多、更远、更快，带湍流漂移 */
    for (var i = 0; i < 170; i++) {
      var ang = rand2() * Math.PI * 2;
      var spd = 0.10 + Math.pow(rand2(), 0.7) * 1.05;
      burst.parts.push({
        x: bx, y: by,
        vx: Math.cos(ang) * spd * 118,
        vy: Math.sin(ang) * spd * 118,
        r: 0.7 + rand2() * 3.4,
        life: 760 + rand2() * 1240,
        drift: 0.4 + rand2() * 1.1,
        driftA: rand2() * Math.PI * 2
      });
    }
    /* 双层扩张波环（第二层稍晚出现） */
    for (var r = 0; r < 2; r++) {
      burst.rings.push({ delay: r * 0.12 * 1000, done: false });
    }
    setTimeout(function () { section.classList.remove("light-burst"); }, 2650);
    wake();
  }
  function drawBurst(ts) {
    if (!burst) return;
    var p = (ts - burst.start) / burst.dur;
    if (p >= 1) { burst = null; return; }
    var ease = 1 - Math.pow(1 - p, 3);
    var cx = W / 2, cy = H / 2;
    var R = Math.max(W, H) * 0.72;
    /* 亮度脉冲：主光球先闪后稳（白 → 蓝紫 → 透明），带脉冲峰值 */
    var pulse = Math.max(0, 1 - p) * (1 + 0.55 * Math.sin(p * Math.PI * 3));
    var gr = Math.max(1, ease * R * (1 + 0.12 * (1 - p)));
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    g.addColorStop(0, "rgba(255,255,255," + (0.95 * pulse).toFixed(3) + ")");
    g.addColorStop(0.3, "rgba(202,216,255," + (0.6 * pulse).toFixed(3) + ")");
    g.addColorStop(0.66, "rgba(146,126,228," + (0.3 * pulse).toFixed(3) + ")");
    g.addColorStop(1, "rgba(110,100,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    /* 扩张波环：同心圆环从中心炸开扩散 */
    ctx.lineWidth = 2;
    for (var ri = 0; ri < burst.rings.length; ri++) {
      var ring = burst.rings[ri];
      var rp = (ts - burst.start - ring.delay) / 1300;
      if (rp <= 0) continue;
      if (rp >= 1) { ring.done = true; continue; }
      var rr = easeOutCubic(rp) * R * 1.05;
      var ra = Math.max(0, 1 - rp) * 0.5;
      ctx.strokeStyle = "rgba(226,236,255," + ra.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, rr), 0, Math.PI * 2);
      ctx.stroke();
      /* 环外柔和尾迹 */
      ctx.strokeStyle = "rgba(170,182,238," + (ra * 0.4).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, rr * 0.86), 0, Math.PI * 2);
      ctx.stroke();
    }
    /* 星尘喷涌：快速向外扩散 + 湍流随机游走漂移 */
    for (var i = 0; i < burst.parts.length; i++) {
      var pt = burst.parts[i];
      pt.x += pt.vx * 0.016;
      pt.y += pt.vy * 0.016;
      pt.vx *= 0.982; pt.vy *= 0.982;
      pt.driftA += (rand2() - 0.5) * 0.9;
      pt.x += Math.cos(pt.driftA) * pt.drift * 0.5;
      pt.y += Math.sin(pt.driftA) * pt.drift * 0.5;
      var lp = 1 - (ts - burst.start) / pt.life;
      if (lp <= 0) continue;
      var al = Math.max(0, lp) * 0.85;
      ctx.fillStyle = "rgba(226,234,255," + al.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r * (0.4 + lp * 0.8), 0, Math.PI * 2);
      ctx.fill();
      /* 星尘外层柔光 */
      if (lp > 0.6) {
        ctx.globalAlpha = Math.max(0, (lp - 0.6) * 1.5) * 0.32;
        ctx.fillStyle = "rgba(178,190,242,1)";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  /* 星星从大爆炸中"生长出来"：位置从中心迸发 + 大小从 0 长大 */
  function starBurstGrow(ts) {
    if (!burst) return 1;
    var bp = (ts - burst.start) / burst.dur;
    if (bp >= 1) return 1;
    if (bp < 0.28) return 0;
    var g = clamp((bp - 0.28) / 0.52, 0, 1);
    return 1 - Math.pow(1 - g, 3);
  }

  /* ---------- 尺寸与可见性 ---------- */
  function resize() {
    var r = section.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bgCanvas = buildBg(W, H);
    sizeParticleLayer();
    renderFrame(performance.now());
  }
  function sizeParticleLayer() {
    if (!pLayer || !pCtx) return;
    var r = section.getBoundingClientRect();
    pW = Math.max(1, r.width); pH = Math.max(1, r.height);
    pDPR = Math.min(window.devicePixelRatio || 1, 1.5);
    pLayer.width = Math.round(pW * pDPR);
    pLayer.height = Math.round(pH * pDPR);
    pCtx.setTransform(pDPR, 0, 0, pDPR, 0, 0);
  }

  var sectionVisible = true;
  try {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        var en = entries[0];
        sectionVisible = en.isIntersecting;
        if (sectionVisible) {
          wake(600);
        } else if (!interacting && !drag) {
          stopLoop();
        }
      }, { threshold: 0.15 });
      io.observe(section);
    }
  } catch (e) {}
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stopLoop(); else wake(600);
  });

  /* ---------- 大小映射：heat + 内容规模（size）加权 ---------- */
  function starSize(st) {
    var base = 2.2 + st.heat * 0.6 + st.size * 0.7;
    var r = rating[st.id];
    if (r === "like") base *= 1.3;
    else if (r === "dislike") base *= 0.5;
    return base;
  }

  /* ---------- 渲染 ---------- */
  function project(p, radFactor) {
    var rf = radFactor || 1;
    var cy = Math.cos(rotationX), sy = Math.sin(rotationX);
    var cz = Math.cos(rotationY), sz = Math.sin(rotationY);
    var x1 = p.x * cz * rf - p.z * sz * rf;
    var z1 = p.x * sz * rf + p.z * cz * rf;
    var y1 = p.y * cy * rf - z1 * sy;
    var z2 = p.y * sy + z1 * cy;
    var scale = FOV / (VIEW_DIST - z2 * zoom);
    return { x: W / 2 + x1 * RADIUS * scale, y: H / 2 + y1 * RADIUS * scale, z: z2, s: scale };
  }

  /* ---------- 星座线绘制：先画淡组，再画高亮组（双层描边微光扩散） ----------
     线在星点之前绘制，星点自然覆盖端点，避免遮挡突兀；随 3D 旋转联动 */
  function drawConstellations(ts, list) {
    if (reduced || !constGroups.length) return;
    var active = hoverStar ? groupOfId(hoverStar) : (currentStar ? groupOfId(currentStar.st ? currentStar.st.id : currentStar.id) : null);
    var projOf = {};
    for (var j = 0; j < list.length; j++) projOf[list[j].i] = list[j];
    var grow = starBurstGrow(ts);
    for (var pass = 0; pass < 2; pass++) {
      for (var g = 0; g < constGroups.length; g++) {
        var chain = constGroups[g];
        var isActive = active && groupOfId(pts[chain[0]].st.code) === active;
        if (pass === 0 && isActive) continue;
        if (pass === 1 && !isActive) continue;
        ctx.beginPath();
        var started = false;
        for (var c = 0; c < chain.length; c++) {
          if (!isVisible(pts[chain[c]].st)) continue;
          var pj = projOf[chain[c]];
          if (!pj || pj.s < 0.02) { started = false; continue; }
          var x = pj.x, y = pj.y;
          if (grow < 1) {
            x = W / 2 + (x - W / 2) * grow;
            y = H / 2 + (y - H / 2) * grow;
          }
          if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
        }
        if (!started) continue;
        if (isActive) {
          /* 高亮组：外层宽线微光扩散 + 内层细线主体 */
          ctx.lineCap = "round";
          ctx.strokeStyle = "rgba(186,204,235,0.13)";
          ctx.lineWidth = 3.2;
          ctx.stroke();
          ctx.strokeStyle = "rgba(198,216,244,0.55)";
          ctx.lineWidth = 0.9;
          ctx.stroke();
        } else {
          ctx.lineCap = "butt";
          ctx.strokeStyle = "rgba(170,188,222,0.10)";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }
  }

  var lastRenderTs = 0;
  function renderFrame(ts) {
    if (!lastRenderTs) lastRenderTs = ts;
    var dt = Math.max(1, ts - lastRenderTs);
    lastRenderTs = ts;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    /* 渐变夜空背景（视差） */
    var px = Math.sin(rotationY) * W * 0.03;
    var py = Math.sin(rotationX) * H * 0.02;
    ctx.drawImage(bgCanvas, -bgPad + px, -bgPad + py, W + bgPad * 2, H + bgPad * 2);
    /* 流动渐变背景：中心漂移的低饱和渐变，柔和持续 */
    drawFlowBg(ts);
    /* 星系带：沿银道面的柔光星云带（radial 渐变柔边） */
    drawGalaxyBand(ts);
    /* 流动发散渐变光（动态背景光效，绘制在暗角之前） */
    drawFlowGlow(ts);
    /* 暗角（避免光污染） */
    var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(2,3,8,0.58)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    var lightX = Math.cos(rotationY + 0.9) * Math.cos(rotationX * 0.6);
    var lightY = Math.sin(rotationX * 0.9);
    var list = [];
    for (var i = 0; i < N; i++) {
      var p0 = pts[i];
      var ph0 = (Math.sin(ts * p0.breathSpeed + p0.breathPhase) + 1) / 2;
      var rb = reduced ? 1 : (1 + p0.breathAmp * (easeIO(ph0) * 2 - 1));
      var pr = project(p0, rb);
      pr.i = i;
      pr.ph0 = ph0;
      list.push(pr);
    }
    list.sort(function (a, b) { return a.z - b.z; });

    /* 星座线：同组星连接，随 3D 旋转联动（绘制在星点之前，星点覆盖端点不突兀） */
    drawConstellations(ts, list);

    /* 星星从大爆炸中"生长出来"：位置从中心向外迸发 + 大小从 0 长大 */
    var grow = starBurstGrow(ts);
    for (var j = 0; j < N; j++) {
      var it = list[j], p = pts[it.i], st = p.st;
      if (it.s < 0.02) continue;
      if (!isVisible(st)) continue;
      if (grow < 1) {
        it.x = W / 2 + (it.x - W / 2) * grow;
        it.y = H / 2 + (it.y - H / 2) * grow;
      }
      var size = starSize(p) * (0.4 + 0.6 * grow);
      if (!reduced) size *= (1 + 0.10 * Math.sin(ts * p.breathSpeed * 1.6 + p.breathPhase));
      var nx = p.x, ny = p.y, nz = p.z;
      var dot = (nx * lightX + ny * lightY + nz * 0.55) / Math.sqrt(nx * nx + ny * ny + nz * nz + 0.001);
      var light = 0.5 + 0.5 * Math.max(0, dot);
      var tw = reduced ? 1 : (1 + 0.09 * Math.sin(ts * 0.0012 * p.twSpeed + p.phase));
      var alpha = clamp(light * tw * (reduced ? 1 : (0.78 + 0.22 * it.ph0)), 0.22, 1.15);
      var r = rating[st.id];
      var tint = r === "dislike" ? 0.8 : 1;
      ctx.globalAlpha = alpha * 0.12 * (p.heat / 5);
      var gs = size * 6.2;
      ctx.drawImage(glowSprite, it.x - gs / 2, it.y - gs / 2, gs, gs);
      ctx.globalAlpha = alpha * 0.34 * (p.heat / 5 + 0.4);
      var cs = size * 2.6;
      ctx.drawImage(coreSprite, it.x - cs / 2, it.y - cs / 2, cs, cs);
      ctx.globalAlpha = clamp(alpha * 0.9, 0.35, 1) * tint;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(it.x, it.y, Math.max(0.6, size * 0.42 * (it.s > 0.06 ? 1 : 0.6)), 0, Math.PI * 2);
      ctx.fill();
      /* 星周微尘呼吸粒子 */
      if (!reduced) {
        var cx0 = W / 2, cy0 = H / 2;
        var dx0 = it.x - cx0, dy0 = it.y - cy0;
        var dist0 = Math.max(1, Math.sqrt(dx0 * dx0 + dy0 * dy0));
        var ux = dx0 / dist0, uy = dy0 / dist0;
        var dPh = (Math.sin(ts * p.breathSpeed * 1.18 + p.breathPhase + 0.9) + 1) / 2;
        var dE = easeIO(dPh);
        for (var k = 0; k < 3; k++) {
          var off = size * (0.85 + dE * 2.1 + k * 0.9);
          var dw = size * (0.26 + 0.18 * dE);
          var da = (0.20 + 0.16 * (1 - Math.abs(dE * 2 - 1))) * alpha;
          ctx.globalAlpha = clamp(da, 0.03, 0.34);
          ctx.fillStyle = "rgba(200, 212, 234, 1)";
          ctx.beginPath();
          ctx.arc(it.x + ux * off, it.y + uy * off, Math.max(0.4, dw * (it.s > 0.06 ? 1 : 0.7)), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      if (hoverStar === st.id) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(190, 205, 235, 0.9)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(it.x, it.y, size * 1.6 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    /* 光爆过渡（绘制在最上层） */
    drawBurst(ts);
    if (hoverStar === null && finePointer) {
      canvas.style.cursor = "grab";
    }
  }

  /* ---------- 动画循环 ---------- */
  function tick(ts) {
    if (!running) return;
    if (!sectionVisible && !interacting && !drag) { stopLoop(); return; }
    if (!lastTs) lastTs = ts;
    var dt = Math.min(50, ts - lastTs); lastTs = ts;
    if (autoRotate && !drag && !interacting && !reduced) {
      if (Date.now() - lastAutoTime > 3200) rotationY += 0.0016 * (dt / 16.67);
    }
    if (!drag && !interacting) {
      if (Math.abs(velX) > 0.00001 || Math.abs(velY) > 0.00001) {
        rotationY += velX * (dt / 16.67);
        rotationX += velY * (dt / 16.67);
        velX *= 0.94; velY *= 0.94;
        if (Math.abs(velX) < 0.00002 && Math.abs(velY) < 0.00002) { velX = 0; velY = 0; }
      }
    }
    if (Math.abs(targetZoom - zoom) > 0.0005) {
      zoom += (targetZoom - zoom) * 0.12;
    } else zoom = targetZoom;
    renderFrame(ts);
    rafId = requestAnimationFrame(tick);
  }
  function wake(delay) {
    interacting = true;
    lastAutoTime = Date.now() + (delay || 0);
    if (!running) {
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
    if (delay) {
      setTimeout(function () { interacting = false; }, delay);
    } else {
      interacting = false;
    }
  }
  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0; running = false;
  }

  /* ---------- 全局鼠标控制：缩放 / 方向 / 点击（绑定整个星空板块，页面内任意位置均可操控） ---------- */
  var finePointer = false;
  try { finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) {}
  var isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

  function pos(e) {
    var r = section.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitTest(x, y) {
    var best = null, bd = 1e9;
    for (var i = 0; i < N; i++) {
      if (!isVisible(pts[i].st)) continue;
      var pr = project(pts[i]);
      var sz = starSize(pts[i]) + 6;
      var dx = pr.x - x, dy = pr.y - y;
      var d = dx * dx + dy * dy;
      if (d < sz * sz && d < bd) { bd = d; best = pts[i]; }
    }
    return best;
  }

  var pointerState = { id: null, x: 0, y: 0, px: 0, py: 0, active: 0, d0: 0, pinch: 0 };
  section.addEventListener("pointerdown", function (e) {
    if (panel && !panel.hidden) return;
    e.preventDefault();
    try { section.setPointerCapture(e.pointerId); } catch (err) {}
    pointerState.active++;
    var p = pos(e);
    if (pointerState.active === 1) {
      pointerState.id = e.pointerId; pointerState.x = p.x; pointerState.y = p.y;
      pointerState.px = p.x; pointerState.py = p.y;
      drag = { x: p.x, y: p.y, rx: rotationY, ry: rotationX, moved: false };
      downT = Date.now();
    } else if (pointerState.active === 2) {
      pointerState.d0 = Math.hypot(pointerState.x - p.x, pointerState.y - p.y);
      pointerState.pinch = pointerState.d0;
    }
    wake();
  });
  section.addEventListener("pointermove", function (e) {
    var p = pos(e);
    if (finePointer && drag && pointerState.active === 1 && !reduced) {
      canvas.style.cursor = "grabbing";
      drag.moved = drag.moved || Math.hypot(p.x - drag.x, p.y - drag.y) > 3;
      rotationY = drag.rx + (p.x - drag.x) * 0.0065;
      rotationX = clamp(drag.ry + (p.y - drag.y) * 0.005, -1.25, 1.25);
      velX = (p.x - pointerState.px) * 0.0065;
      velY = (p.y - pointerState.py) * 0.005;
      pointerState.px = p.x; pointerState.py = p.y;
      renderFrame(performance.now());
    } else if (finePointer && !drag && !isTouch) {
      var prev = hoverStar;
      var hit = hitTest(p.x, p.y);
      hoverStar = hit ? hit.st.id : null;
      if (hoverStar !== prev) renderFrame(performance.now());
      canvas.style.cursor = hoverStar ? "pointer" : "grab";
    }
  });
  function endPointer(e) {
    var p = pos(e);
    if (drag && pointerState.active === 1) {
      var wasMove = drag.moved;
      var dt = Date.now() - downT;
      if (!wasMove && dt < 500 && !reduced) {
        var hit = hitTest(p.x, p.y);
        if (hit) openPanel(hit.st); else closePanel();
      } else if (wasMove) {
        velX *= 0.86; velY *= 0.86;
      }
      drag = null;
      wake(0);
      if (finePointer && !reduced) { canvas.style.cursor = "grab"; renderFrame(performance.now()); }
    }
    pointerState.active = Math.max(0, pointerState.active - 1);
    if (pointerState.pinch && pointerState.active < 2) pointerState.pinch = 0;
  }
  section.addEventListener("pointerup", endPointer);
  section.addEventListener("pointercancel", endPointer);
  section.addEventListener("pointerleave", function () {
    if (!drag && finePointer) { hoverStar = null; renderFrame(performance.now()); }
  });
  section.addEventListener("wheel", function (e) {
    e.preventDefault();
    targetZoom = clamp(targetZoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.75, 2.4);
    wake();
  }, { passive: false });
  section.addEventListener("dblclick", function (e) {
    e.preventDefault();
    clearTimeout(pendingOpenTimer);
    pendingOpenTimer = null;
    var hp = pos(e);
    var hit = hitTest(hp.x, hp.y);
    if (hit) {
      /* 双击星星：打开详情 */
      openPanel(hit.st, hp.x, hp.y);
    } else {
      /* 双击空白：复位视角（缩放/旋转回到默认） */
      rotationX = 0.46;
      rotationY = -0.55;
      targetZoom = 1;
      zoom = 1;
      velX = 0;
      velY = 0;
      wake();
      renderFrame(performance.now());
    }
  });
  /* 双指缩放（pointer events 已在 active===2 时同步） */
  section.addEventListener("pointermove", function (e) {
    if (pointerState.active === 2) {
      var p = pos(e);
      var d = Math.hypot(pointerState.x - p.x, pointerState.y - p.y);
      if (pointerState.d0 > 0) {
        targetZoom = clamp(targetZoom * (d / Math.max(1, pointerState.pinch || d)), 0.75, 2.4);
      }
      pointerState.pinch = d;
      e.preventDefault();
    }
  }, { passive: false });

  /* ---------- 详情面板（粒子散射展开 / 粒子回收关闭） ---------- */
  function openPanel(st, fromX, fromY, opts) {
    if (!panel) return;
    opts = opts || {};
    currentStar = st;
    if (elCode) elCode.textContent = st.code || "";
    if (elName) elName.textContent = getLang() === "en" ? st.name.en : st.name.zh;
    if (elDesc) elDesc.textContent = getLang() === "en" ? st.desc.en : st.desc.zh;
    if (elType) elType.textContent = getLang() === "en" ? st.type.en : st.type.zh;
    if (elSize) {
      var n = parseInt(st.size, 10);
      elSize.textContent = L("大小 " + (isNaN(n) ? (st.size || "") : n), "Size " + (isNaN(n) ? (st.size || "") : n));
    }
    var r = rating[st.id];
    if (elLike) {
      elLike.classList.toggle("active", r === "like");
      elLike.classList.add("star-rate-btn", "like");
    }
    if (elDislike) {
      elDislike.classList.toggle("active", r === "dislike");
      elDislike.classList.add("star-rate-btn", "dislike");
    }
    var mainText = getLang() === "en" ? "Open" : "查看项目";
    if (elLink && st.link) { elLink.href = st.link; elLink.textContent = mainText; elLink.hidden = false; }
    else if (elLink) { elLink.hidden = true; }
    if (elLink2 && st.link2) { elLink2.href = st.link2; elLink2.textContent = getLang() === "en" ? "Related idea" : "相关想法"; elLink2.hidden = false; }
    else if (elLink2) { elLink2.hidden = true; }
    if (reduced || opts.noFx) {
      showPanelNow();
      renderFrame(performance.now());
      return;
    }
    if (particleAnim) { particleAnim = null; particles = []; }
    if (fromX == null || isNaN(fromX)) { fromX = W / 2; fromY = H / 2; }
    spawnParticles(fromX, fromY, 26);
    particleAnim = { mode: "open", t0: performance.now(), dur: 540, sx: fromX, sy: fromY, onDone: showPanelNow };
    ensureAnimLoop();
    renderFrame(performance.now());
  }
  function closePanel(toX, toY) {
    currentStar = null;
    if (panel && panel.hidden) return;
    if (particleAnim) { particleAnim = null; particles = []; }
    /* 面板与遮罩先淡出 */
    if (mask) mask.classList.remove("mask-in");
    if (panel) panel.classList.remove("star-panel-in");
    if (reduced) { hidePanelNow(); return; }
    var sx = W / 2, sy = H / 2;
    if (panel) {
      var pr = panel.getBoundingClientRect();
      var sr = section.getBoundingClientRect();
      sx = pr.left + pr.width / 2 - sr.left;
      sy = pr.top + pr.height / 2 - sr.top;
    }
    if (toX == null || isNaN(toX)) { toX = W / 2; toY = H / 2; }
    spawnParticles(sx, sy, 22);
    particleAnim = { mode: "close", t0: performance.now(), dur: 480, sx: sx, sy: sy, tx: toX, ty: toY, onDone: hidePanelNow };
    ensureAnimLoop();
  }
  function showPanelNow() {
    if (mask) {
      mask.hidden = false;
      requestAnimationFrame(function () { mask.classList.add("mask-in"); });
    }
    if (panel) {
      panel.hidden = false;
      requestAnimationFrame(function () { panel.classList.add("star-panel-in"); });
    }
    renderFrame(performance.now());
  }
  function hidePanelNow() {
    if (mask) mask.hidden = true;
    if (panel) panel.hidden = true;
  }

  /* ---------- 粒子系统 ---------- */
  function spawnParticles(x, y, n) {
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2;
      var spd = 1.2 + Math.random() * 3.6;
      particles.push({
        x: x, y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 0.8 + Math.random() * 2.1,
        alpha: 0.5 + Math.random() * 0.35
      });
    }
  }
  function ensureAnimLoop() {
    if (!animLoopOn && pCtx) {
      animLoopOn = true;
      requestAnimationFrame(particleFrame);
    }
  }
  function particleFrame(ts) {
    if (pCtx) pCtx.clearRect(0, 0, pW, pH);
    var p = particleAnim;
    if (p) {
      var t = clamp((ts - p.t0) / p.dur, 0, 1);
      if (p.mode === "close") {
        /* 汇聚回收：粒子从面板位置飞向星星 */
        var e = easeOutCubic(t);
        for (var i = 0; i < particles.length; i++) {
          var pt = particles[i];
          pt.x = p.sx + (p.tx - p.sx) * e + Math.sin(ts * 0.02 + i) * (1 - t) * 2.2;
          pt.y = p.sy + (p.ty - p.sy) * e + Math.cos(ts * 0.017 + i * 1.3) * (1 - t) * 2.2;
          pt.alpha = 0.9 * (1 - t);
        }
      } else {
        /* 散射展开：从星星位置向外飞散并渐隐 */
        for (var j = 0; j < particles.length; j++) {
          var q = particles[j];
          q.x += q.vx; q.y += q.vy;
          q.vx *= 0.97; q.vy *= 0.97;
          q.alpha = q.alpha * (1 - t * 0.92);
        }
      }
      if (t >= 1) {
        var done = p.onDone;
        particleAnim = null;
        particles = [];
        if (done) done();
      }
    }
    if (pCtx && particles.length) {
      for (var k = 0; k < particles.length; k++) {
        var pp = particles[k];
        if (pp.alpha <= 0.02) continue;
        pCtx.globalAlpha = pp.alpha;
        pCtx.fillStyle = "#cfe0f8";
        pCtx.beginPath();
        pCtx.arc(pp.x, pp.y, Math.max(0.5, pp.r), 0, Math.PI * 2);
        pCtx.fill();
        pCtx.globalAlpha = pp.alpha * 0.32;
        pCtx.fillStyle = "#8fa6d8";
        pCtx.beginPath();
        pCtx.arc(pp.x, pp.y, pp.r * 2.8, 0, Math.PI * 2);
        pCtx.fill();
      }
      pCtx.globalAlpha = 1;
    }
    if (particleAnim || particles.length) {
      requestAnimationFrame(particleFrame);
    } else {
      animLoopOn = false;
      if (pCtx) pCtx.clearRect(0, 0, pW, pH);
    }
  }
  if (elLike) elLike.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!currentStar) return;
    rating[currentStar.id] = rating[currentStar.id] === "like" ? null : "like";
    saveRating();
    openPanel(currentStar);
    renderFrame(performance.now());
  });
  if (elDislike) elDislike.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!currentStar) return;
    rating[currentStar.id] = rating[currentStar.id] === "dislike" ? null : "dislike";
    saveRating();
    openPanel(currentStar);
    renderFrame(performance.now());
  });
  if (elClose) elClose.addEventListener("click", function () { closePanel(); });
  if (mask) mask.addEventListener("click", function () { closePanel(); });

  /* ---------- 语言切换时刷新面板 + 动态统计 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.closest && t.closest("[data-lang-toggle]")) {
      setTimeout(function () {
        if (currentStar) openPanel(currentStar, null, null, { noFx: true });
        rememberFilterTexts();
        applyFilterCounts();
        updateCount();
        renderFrame(performance.now());
      }, 0);
    }
  });

  /* ---------- 数据视图：筛选+搜索后的可见星集合 / 排序 ---------- */
  function visibleStars() {
    var out = [];
    for (var i = 0; i < _allStars.length; i++) if (isVisible(_allStars[i])) out.push(_allStars[i]);
    return out;
  }
  function codeNum(st) {
    var m = String(st && (st.code || st.id) || "").match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }
  function codeAlpha(st) {
    return String(st && (st.code || st.id) || "").charAt(0) || "Z";
  }
  function sortStars(list) {
    var arr = list.slice();
    var en = getLang() === "en";
    if (sortBy === "code-desc") {
      arr.sort(function (a, b) {
        var ca = codeAlpha(a), cb = codeAlpha(b);
        if (ca !== cb) return ca < cb ? 1 : -1;
        return codeNum(b) - codeNum(a);
      });
    } else if (sortBy === "heat") {
      arr.sort(function (a, b) { return (b.heat || 0) - (a.heat || 0); });
    } else if (sortBy === "name") {
      arr.sort(function (a, b) {
        var na = en ? a.name.en : a.name.zh;
        var nb = en ? b.name.en : b.name.zh;
        return String(na).localeCompare(String(nb), en ? "en" : "zh");
      });
    } else {
      arr.sort(function (a, b) {
        var ca = codeAlpha(a), cb = codeAlpha(b);
        if (ca !== cb) return ca < cb ? -1 : 1;
        return codeNum(a) - codeNum(b);
      });
    }
    return arr;
  }

  /* 排序后驱动星空分布重排：星星按新顺序重新落位并重建星座连线 */
  function rebuildPositions() {
    var sorted = sortStars(stars);
    for (var ri = 0; ri < N; ri++) pts[ri].st = sorted[ri];
    stars = sorted;
    var dist = makeStarDistribution(N);
    for (var rj = 0; rj < N; rj++) {
      var dpos = dist[rj % dist.length];
      pts[rj].x = dpos.x;
      pts[rj].y = dpos.y;
      pts[rj].z = dpos.z;
    }
    buildConstellations();
  }

  /* ---------- 动态统计：计数文本 + 筛选按钮分类计数 ---------- */
  function countByGroup(group) {
    if (group === "all") return _allStars.length;
    var list = filterGroups[group] || [];
    var n = 0;
    for (var i = 0; i < _allStars.length; i++) {
      var g0 = String(_allStars[i].code || "").charAt(0);
      for (var k = 0; k < list.length; k++) if (g0 === list[k]) { n++; break; }
    }
    return n;
  }
  function rememberFilterTexts() {
    var bar = document.getElementById("star-db-filter");
    if (!bar) return;
    var btns = Array.prototype.slice.call(bar.querySelectorAll("[data-filter]"));
    btns.forEach(function (b) {
      var f = b.getAttribute("data-filter");
      var txt = String(b.textContent || "").replace(/\s*\(\d+\)$/, "").trim();
      if (txt) filterTexts[f] = txt;
    });
  }
  function applyFilterCounts() {
    var bar = document.getElementById("star-db-filter");
    if (!bar) return;
    var btns = Array.prototype.slice.call(bar.querySelectorAll("[data-filter]"));
    btns.forEach(function (b) {
      var f = b.getAttribute("data-filter");
      if (filterTexts[f] == null) {
        filterTexts[f] = String(b.textContent || "").replace(/\s*\(\d+\)$/, "").trim();
      }
      b.textContent = filterTexts[f] + " (" + countByGroup(f) + ")";
    });
  }
  function updateCount() {
    if (!countEl) return;
    var shown = visibleStars().length;
    var total = _allStars.length;
    if (shown === total) {
      countEl.textContent = L("共 " + total + " 颗星星", total + " stars in total");
    } else {
      countEl.textContent = L("共 " + total + " 颗 · 显示 " + shown + " 颗", total + " in total · " + shown + " shown");
    }
  }

  /* ---------- 空状态 ---------- */
  function updateEmptyStates() {
    var shown = visibleStars().length;
    if (empty3d) empty3d.hidden = shown > 0;
  }

  /* ---------- 重置筛选与搜索 ---------- */
  function resetFilters() {
    activeFilter = "all";
    var bar = document.getElementById("star-db-filter");
    if (bar) {
      var btns = Array.prototype.slice.call(bar.querySelectorAll("[data-filter]"));
      btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-filter") === "all"); });
    }
    var box = document.getElementById("star-db-search");
    if (box) box.value = "";
    searchQuery = "";
    closePanel();
    var hit = document.getElementById("star-db-search-hit");
    if (hit) hit.textContent = "";
    updateCount();
    updateEmptyStates();
    renderFrame(performance.now());
  }

  /* ---------- 搜索定位：设置搜索词，3D 只显示命中星并聚焦第一颗，卡片视图同步过滤 ---------- */
  function applySearch(q) {
    searchQuery = String(q || "").trim().toLowerCase();
    closePanel();
    var hit = document.getElementById("star-db-search-hit");
    var shown = visibleStars().length;
    if (hit) hit.textContent = searchQuery && shown ? String(shown) : "";
    if (searchQuery) {
      var first = null;
      for (var i = 0; i < _allStars.length; i++) {
        if (isVisible(_allStars[i])) { first = _allStars[i]; break; }
      }
      if (first) openPanel(first, null, null, { noFx: true });
    }
    updateCount();
    updateEmptyStates();
    renderFrame(performance.now());
    return shown;
  }

  /* ---------- 控件绑定：筛选按钮 + 搜索框 ---------- */
  function initControls() {
    var bar = document.getElementById("star-db-filter");
    if (bar) {
      var btns = Array.prototype.slice.call(bar.querySelectorAll("[data-filter]"));
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          activeFilter = b.getAttribute("data-filter") || "all";
          btns.forEach(function (x) { x.classList.toggle("active", x === b); });
          closePanel();
          updateCount();
          updateEmptyStates();
          renderFrame(performance.now());
        });
      });
    }
    var box = document.getElementById("star-db-search");
    var clear = document.getElementById("star-db-search-clear");
    if (box) {
      box.addEventListener("input", function () { applySearch(box.value); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          applySearch(box.value);
        }
      });
      if (clear) clear.addEventListener("click", function () {
        box.value = "";
        applySearch("");
        box.focus();
      });
    }
    var sortSel = document.getElementById("star-db-sort");
    if (sortSel) {
      sortBy = sortSel.value || "code-asc";
      sortSel.addEventListener("change", function () {
        sortBy = sortSel.value || "code-asc";
        rebuildPositions();
        triggerLightBurst(false);
        renderFrame(performance.now());
      });
    }
    var resets = Array.prototype.slice.call(document.querySelectorAll(".star-db-empty-reset"));
    resets.forEach(function (b) { b.addEventListener("click", resetFilters); });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    resize();
    initFlowGlows();
    initControls();
    rememberFilterTexts();
    applyFilterCounts();
    updateCount();
    updateEmptyStates();
    setTimeout(function () { triggerLightBurst(true); }, 350);
    wake(500);
    window.addEventListener("resize", function () { resize(); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
