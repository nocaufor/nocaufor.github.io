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

  var W = 0, H = 0, DPR = 1;
  var reduced = false;
  try { reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- 3D 状态 ---------- */
  var FOV = 4.4, VIEW_DIST = 6.0, RADIUS = 3.0;
  var SCALE0 = FOV / VIEW_DIST;   /* 中心平面基准缩放：世界尺度->像素换算系数 */
  var viewRadius = 300;           /* 中央粒子星球的可见半径(px)，随视口在 resize 中更新 */
  var rotationX = 0.30, rotationY = -0.55;
  var velX = 0, velY = 0, drag = null, moved = false, downT = 0;
  var zoom = 1, targetZoom = 1;
  /* 缩放范围：可缩至 0.15 俯瞰整球，也可放大至 9 贴近看清单颗星星细节 */
  var ZOOM_MIN = 0.15, ZOOM_MAX = 9;
  var currentStar = null, hoverStar = null, lastAutoTime = 0;
  var pendingOpenTimer = null;
  var autoRotate = !reduced;
  var interacting = false;
  var rafId = 0, running = false, lastTs = 0;

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
      /* 径向分层：数据星聚成中央"粒子星球"主体（球壳），少量内核点缀 + 外围浮尘 */
      var h2 = frac(Math.sin(s * 127.1 + 311.7) * 43758.5453);
      var rr;
      if (h2 < 0.10) {
        rr = 0.50 + 0.34 * frac(Math.sin(s * 311.7 + 8.1) * 43758.5453);
      } else if (h2 < 0.16) {
        rr = 1.02 + 0.13 * frac(Math.sin(s * 511.3 + 4.2) * 43758.5453);
      } else {
        rr = 0.90 + 0.11 * frac(Math.sin(s * 771.9 + 6.6) * 43758.5453);
      }
      out.push({
        x: (sp.x + nzX * 0.07) * rr,
        y: (sp.y + nzY * 0.07) * rr,
        z: (sp.z + nzZ * 0.07) * rr
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
  /* 暖金色温 sprite：高热星（heat >= 4）渲染为暖金辉光，与冷蓝主色形成星点色温层次 */
  var warmGlowSprite = makeGlow(128, [
    [0, "rgba(246, 222, 190, 0.5)"], [0.25, "rgba(224, 190, 152, 0.20)"],
    [0.6, "rgba(178, 148, 116, 0.06)"], [1, "rgba(150, 122, 92, 0)"]
  ]);
  var warmCoreSprite = makeGlow(64, [
    [0, "rgba(255, 246, 232, 0.92)"], [0.3, "rgba(244, 214, 178, 0.45)"],
    [0.7, "rgba(214, 176, 138, 0.10)"], [1, "rgba(196, 158, 120, 0)"]
  ]);

  function rand2() { return Math.random(); }

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
    burst = { dur: 1500, start: performance.now(), parts: [], rings: [] };
    var bx = W / 2, by = H / 2;
    /* 星尘：数量减半、速度放缓，只作入场的柔和点缀 */
    for (var i = 0; i < 80; i++) {
      var ang = rand2() * Math.PI * 2;
      var spd = 0.08 + Math.pow(rand2(), 0.8) * 0.55;
      burst.parts.push({
        x: bx, y: by,
        vx: Math.cos(ang) * spd * 66,
        vy: Math.sin(ang) * spd * 66,
        r: 0.5 + rand2() * 1.7,
        life: 520 + rand2() * 620,
        drift: 0.25 + rand2() * 0.55,
        driftA: rand2() * Math.PI * 2
      });
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
    /* 柔和光晕脉冲：中心一次低透明度的径向辉光，无硬边圆环 */
    var pulse = Math.max(0, 1 - p) * (1 + 0.28 * Math.sin(p * Math.PI * 3));
    var gr = Math.max(1, ease * R * (0.6 + 0.08 * (1 - p)));
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
    g.addColorStop(0, "rgba(235,242,255," + (0.42 * pulse).toFixed(3) + ")");
    g.addColorStop(0.28, "rgba(196,208,255," + (0.24 * pulse).toFixed(3) + ")");
    g.addColorStop(0.66, "rgba(150,132,228," + (0.12 * pulse).toFixed(3) + ")");
    g.addColorStop(1, "rgba(110,100,200,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    /* 星尘喷涌：向外扩散 + 湍流随机游走漂移 */
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
    viewRadius = Math.min(W, H) * 0.30;
    DPR = Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.25 : 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    renderFrame(performance.now());
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

  /* 缩放视觉系数：放大时星体像素同步放大，缩小俯瞰时保持星点可读（zoom=1 恒为 1，与旧版观感一致） */
  function zoomVisual() {
    return Math.max(1, Math.pow(zoom, 0.72));
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
    var scale = FOV / (VIEW_DIST - z2) * zoom;
    var kPx = viewRadius / (RADIUS * SCALE0);
    return { x: W / 2 + x1 * RADIUS * scale * kPx, y: H / 2 + y1 * RADIUS * scale * kPx, z: z2, s: scale };
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
          ctx.strokeStyle = "rgba(186,204,235,0.09)";
          ctx.lineWidth = 3.0;
          ctx.stroke();
          ctx.strokeStyle = "rgba(198,216,244,0.42)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          ctx.lineCap = "butt";
          ctx.strokeStyle = "rgba(166,184,220,0.055)";
          ctx.lineWidth = 0.6;
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
    /* 纯色背景由 .star-db-stage 提供，主画布只绘制星表数据层 */

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
      var size = starSize(p) * (0.4 + 0.6 * grow) * zoomVisual();
      if (!reduced) size *= (1 + 0.10 * Math.sin(ts * p.breathSpeed * 1.6 + p.breathPhase));
      var nx = p.x, ny = p.y, nz = p.z;
      var dot = (nx * lightX + ny * lightY + nz * 0.55) / Math.sqrt(nx * nx + ny * ny + nz * nz + 0.001);
      var light = 0.5 + 0.5 * Math.max(0, dot);
      var tw = reduced ? 1 : (1 + 0.09 * Math.sin(ts * 0.0012 * p.twSpeed + p.phase));
      var alpha = clamp(light * tw * (reduced ? 1 : (0.78 + 0.22 * it.ph0)), 0.22, 1.15);
      var r = rating[st.id];
      var tint = r === "dislike" ? 0.8 : 1;
      /* 星点色温分层：高热星（heat >= 4）呈暖金，其余保持冷蓝白，丰富星点色彩而不喧宾夺主 */
      var warm = p.heat >= 4;
      var halo = warm ? warmGlowSprite : glowSprite;
      var core = warm ? warmCoreSprite : coreSprite;
      ctx.globalAlpha = alpha * 0.12 * (p.heat / 5);
      var gs = size * 6.2;
      ctx.drawImage(halo, it.x - gs / 2, it.y - gs / 2, gs, gs);
      ctx.globalAlpha = alpha * 0.34 * (p.heat / 5 + 0.4);
      var cs = size * 2.6;
      ctx.drawImage(core, it.x - cs / 2, it.y - cs / 2, cs, cs);
      ctx.globalAlpha = clamp(alpha * 0.9, 0.35, 1) * tint;
      ctx.fillStyle = warm ? "rgba(255, 246, 232, 1)" : "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(it.x, it.y, Math.max(0.6, size * 0.42 * (it.s > 0.06 ? 1 : 0.6)), 0, Math.PI * 2);
      ctx.fill();
      if (hoverStar === st.id) {
        /* 柔光光圈：径向渐变弥散辉光替代硬边描边圆环，肉眼只见柔和光斑 */
        var hR = size * 5.2 + 12;
        var hg = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, hR);
        hg.addColorStop(0, "rgba(226, 236, 255, 0.34)");
        hg.addColorStop(0.32, "rgba(184, 200, 246, 0.16)");
        hg.addColorStop(0.65, "rgba(150, 168, 230, 0.06)");
        hg.addColorStop(1, "rgba(140, 158, 228, 0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(it.x, it.y, hR, 0, Math.PI * 2);
        ctx.fill();
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
    /* 减少动态偏好：帧率降到约 30fps，进一步降低低端设备渲染压力 */
    if (reduced && ts - lastTs < 33) { rafId = requestAnimationFrame(tick); return; }
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
  var isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  var finePointer = false;
  try { finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch (e) {}
  var isTouch = isTouchDevice;

  function pos(e) {
    var r = section.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitTest(x, y) {
    var best = null, bd = 1e9;
    var zfx = zoomVisual();
    for (var i = 0; i < N; i++) {
      if (!isVisible(pts[i].st)) continue;
      var pr = project(pts[i]);
      var sz = (starSize(pts[i]) + 6) * zfx;
      var dx = pr.x - x, dy = pr.y - y;
      var d = dx * dx + dy * dy;
      if (d < sz * sz && d < bd) { bd = d; best = pts[i]; }
    }
    return best;
  }

  var pointerState = { id: null, x: 0, y: 0, px: 0, py: 0, active: 0, d0: 0, pinch: 0 };
  section.addEventListener("pointerdown", function (e) {
    if (panel && !panel.hidden) return;
    /* 仅具体控件/空状态层上的点击不触发星空拖拽；控制栏容器已由 CSS pointer-events:none 放行穿透，覆盖区星星可点 */
    if (e.target && e.target.closest && e.target.closest(".star-db-search, .star-db-search-clear, .star-db-search-wrap, .star-db-filter, .filter-btn, .star-db-sort, .star-db-sort-select, .star-db-count, .star-db-empty")) return;
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
    targetZoom = clamp(targetZoom * (e.deltaY > 0 ? 1.1 : 0.9), ZOOM_MIN, ZOOM_MAX);
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
      rotationX = 0.30;
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
        targetZoom = clamp(targetZoom * (d / Math.max(1, pointerState.pinch || d)), ZOOM_MIN, ZOOM_MAX);
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
    showPanelNow();
    renderFrame(performance.now());
  }
  function closePanel(toX, toY) {
    currentStar = null;
    if (panel && panel.hidden) return;
    /* 面板与遮罩先淡出 */
    if (mask) mask.classList.remove("mask-in");
    if (panel) panel.classList.remove("star-panel-in");
    hidePanelNow();
  }
  function showPanelNow() {
    /* 锁定页面滚动，防止面板下层滚动穿透 */
    document.body.classList.add("star-panel-open");
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
    document.body.classList.remove("star-panel-open");
    if (mask) mask.hidden = true;
    if (panel) panel.hidden = true;
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
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel && !panel.hidden) closePanel();
  });

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
