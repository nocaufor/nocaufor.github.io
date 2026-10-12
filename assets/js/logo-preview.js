/* ============================================================
   NOCAU 图标设计样板页 · logo-preview.js
   独立样板交互（未并入站点导航与主页）：
   - 主题切换与全站共享（html[data-theme] + localStorage nocau-theme）
   - 首屏 3D：本地 model-viewer + 站点自有 glTF（缎面金属地球 + 轨道环绕）
   - 相机装配：平视 → 俯视 · 加速后匀速环绕（延续 home-new.js 实现思路）
   - 视角转变完成后：双手自底部升起捧起地球，动画定格为最终 LOGO 画面
   - prefers-reduced-motion / 低端设备（weak）：静态定格降级
   - CSP script-src 'self' 兼容：零内联、零外链
   零依赖、零构建，GitHub Pages 直接可用。
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "nocau-theme";
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var finePointer = !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);

  /* ---------- 相位文案中英（与全站 nocau-lang 联动，语言切换时自动刷新） ---------- */
  var PHASE_TEXT = {
    zh: { orbit: "轨道环绕 · 视角转变中…", finale: "双手捧起 · LOGO 定格", flat: "立体收敛 · 平面定格", static: "静态定格（动效已减弱）" },
    en: { orbit: "Orbiting · view shifting…", finale: "Hands hold · LOGO frozen", flat: "Flattening · icon freeze", static: "Static frame (motion reduced)" }
  };
  var phaseState = "orbit";

  function currentLang() {
    var stored = null;
    try { stored = localStorage.getItem("nocau-lang"); } catch (e) {}
    return stored === "en" ? "en" : "zh";
  }

  function applyPhaseText() {
    var phase = document.getElementById("lp-phase");
    if (!phase) return;
    phase.textContent = PHASE_TEXT[currentLang()][phaseState] || PHASE_TEXT.zh[phaseState];
  }

  function syncThemeIcons(theme) {
    var sun = document.querySelector("#theme-toggle .icon-sun");
    var moon = document.querySelector("#theme-toggle .icon-moon");
    if (sun) sun.style.display = theme === "light" ? "" : "none";
    if (moon) moon.style.display = theme === "dark" ? "" : "none";
  }

  /* ---------- 主题初始化 / 切换（与全站共享 nocau-theme 存储） ---------- */
  function initTheme() {
    var btn = document.getElementById("theme-toggle");
    var stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
    var theme = stored === "light" || stored === "dark" ? stored : "dark";
    root.setAttribute("data-theme", theme);
    syncThemeIcons(theme);

    if (!btn) return;
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      syncThemeIcons(next);
    });
  }

  /* ---------- WebGL 探测 ---------- */
  function webglSupported() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  /* ---------- 主题随动材质 ----------
     - TrackLine：轨道细线，浅色主题取深墨、深色主题取亮银（同首页）
     - EarthSatin：地球缎面金属基底，深色主题略压暗乘色，令大陆/海洋贴图融入暗场
       同时保持浅色主题的高调白场（浅色下贴图色彩更明快） */
  var TRACK_LINE_HEX = { light: 0x2b2e33, dark: 0xe2e6ec };
  var EARTH_TINT = {
    light: [1.0, 1.0, 1.0, 1.0],
    dark: [0.76, 0.83, 0.94, 1.0]
  };
  var THEMED_MATERIALS = {
    TrackLine: TRACK_LINE_HEX,
    EarthSatin: null /* 地球使用乘色而非整色替换，保留程序化贴图大陆/海洋纹理 */
  };

  function paintTrackLine(mv, theme) {
    if (!mv) return;
    var key = theme === "light" ? "light" : "dark";
    var tint = EARTH_TINT[key];
    try {
      var model = mv.model;
      if (!model || !model.materials) return;
      Array.prototype.forEach.call(model.materials, function (m) {
        if (!m || !m.name) return;
        if (!Object.prototype.hasOwnProperty.call(THEMED_MATERIALS, m.name)) return;
        var f;
        if (m.name === "EarthSatin") {
          f = tint;
        } else {
          f = hexToLinearFactor(THEMED_MATERIALS[m.name][key]);
        }
        try {
          m.pbrMetallicRoughness.baseColorFactor = f;
        } catch (e2) {
          try { m.pbrMetallicRoughness.setBaseColorFactor(f); } catch (e3) {}
        }
      });
    } catch (e) {}
  }

  function srgbToLinear(channel) {
    var c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function hexToLinearFactor(hex) {
    return [
      srgbToLinear((hex >> 16) & 255),
      srgbToLinear((hex >> 8) & 255),
      srgbToLinear(hex & 255),
      1.0,
    ];
  }

  /* ---------- 低端设备降级：关闭交互与自动旋转、减阴影，静态定格 ---------- */
  function clampViewer(mv, weak) {
    if (!weak) return;
    mv.removeAttribute("auto-rotate");
    mv.removeAttribute("camera-controls");
    mv.setAttribute("interaction-policy", "none");
    mv.setAttribute("shadow-intensity", "0.6");
    mv.setAttribute("exposure", "1");
  }

  /* ---------- 相机装配：平视 → 俯视 · 加速后匀速环绕 → 减速对准 → 3D→2D 平面化定格 ----------
     - 阶段一（0 ~ 5.2s）：phi 从平视 78° 指数收敛到俯视；theta 沿加速曲线由慢到快匀速环绕（24deg/s）
     - 减速窗口（5.2s ~ 6.8s）：环绕减速，theta 提前缓动对准正面定格角，phi 继续下沉，glTF 倍速渐降
     - 阶段二（finale，6.8s ~ 9.2s）：theta/phi 收敛至定格姿态；镜头缓慢推近（radius 100%→90%）+
       视场角收窄（30°→26°）形成电影感“长焦压缩 / 焦点聚拢”；双手升起、LOGO 文字淡入
     - 平面化（finale 后 2.4s）：加 .is-flat —— 3D 场景失焦淡出（blur），2D 扁平图标层浮现定格，
       完成“立体 3D → 二维 LOGO”无缝演变，最终画面即 favicon 级品牌图标
     - 用户拖拽时暂停自动驱动并跟随其姿态，松手 2s 后重新缓升（finale 已定格则不再恢复环绕）
     - prefers-reduced-motion / weak：不启动驱动，直接静态定格最终 2D 图标画面
     - 每帧写一次 camera-orbit / field-of-view（interpolation-decay=0 即时到位）与 time-scale，帧间连续无跳变 */
  var CAM_PHI_LEVEL = 78;
  var CAM_PHI_TOP = 26;
  var CAM_PHI_TAU = 1.2;
  var CAM_SPIN_MAX = 24;
  var CAM_ACCEL_TAU = 1.2;
  var CAM_GLTF_SCALE = 2;
  var CAM_FINALE_MS = 6800;     /* 阶段一总时长：环绕展示完成后进入定格 */
  var CAM_DECEL_AT = 5200;      /* 环绕减速窗口：最后 ~1.6s 提前缓动对准正面，避免 finale 生硬急转 */
  var CAM_F_THETA = -27;        /* 定格方位角：回到正面 */
  var CAM_F_PHI = 22;           /* 定格俯角：略低于环绕俯视，令地球稍显托举感 */
  var CAM_F_TAU = 0.9;          /* 定格收敛时间常数（秒） */
  var CAM_F_RADIUS_PCT = 90;    /* 定格推近：镜头从 100% 缓慢推近至 90%（电影感推镜） */
  var CAM_FOV_START = 30;       /* 起始视场角（deg，model-viewer 默认） */
  var CAM_FOV_END = 26;         /* 定格视场角：略收窄，产生长焦压缩 / 焦点聚拢感 */
  var CAM_FLAT_MS = 2400;       /* finale 后多久进入 3D→2D 平面化过渡（ms） */
  var CAM_RESUME_MS = 2000;
  var CAM_RADIUS = "100%";

  function initCameraRig(mv, weak) {
    var card = document.getElementById("lp-card");
    var stage = document.getElementById("lp-stage");
    if (!card || !stage) return;

    mv.removeAttribute("auto-rotate");

    /* 静态降级：reduced-motion 或低端设备 → 直接定格最终 2D 图标画面（无动画） */
    if (reduce || weak) {
      mv.setAttribute("camera-orbit", CAM_F_THETA + "deg " + CAM_F_PHI + "deg " + CAM_F_RADIUS_PCT + "%");
      mv.setAttribute("field-of-view", CAM_FOV_END + "deg");
      try { mv.timeScale = 0; } catch (e) {}
      card.classList.add("is-finale");
      card.classList.add("is-flat");
      phaseState = "static";
      applyPhaseText();
      return;
    }

    var theta = -27;
    var phi = CAM_PHI_LEVEL;
    var t0 = performance.now();
    var last = 0;
    var idleUntil = 0;
    var resumeAt = t0;
    var intent = false;
    var finale = false;
    var finaleAt = 0;
    var flat = false;
    var radiusPct = 100;
    var fovDeg = CAM_FOV_START;

    function readOrbit() {
      if (typeof mv.getCameraOrbit !== "function") return null;
      try {
        var o = mv.getCameraOrbit();
        if (!o) return null;
        return { theta: o.theta * 180 / Math.PI, phi: o.phi * 180 / Math.PI };
      } catch (e) { return null; }
    }

    function triggerFinale(ts) {
      finale = true;
      finaleAt = ts;
      card.classList.add("is-finale");
      phaseState = "finale";
      applyPhaseText();
    }

    function frame(ts) {
      window.requestAnimationFrame(frame);
      var dt = last ? Math.min(0.06, (ts - last) / 1000) : 0;
      last = ts;

      if (!finale && ts - t0 >= CAM_FINALE_MS) triggerFinale(ts);

      if (intent || ts < idleUntil) {
        var cur = readOrbit();
        if (cur) { theta = cur.theta; phi = cur.phi; }
        try { mv.timeScale = 0; } catch (e) {}
        return;
      }

      if (finale) {
        /* 阶段二：收敛到正面定格角 + 镜头推近 + 视场角收窄（长焦聚拢），动画倍速渐降为 0 */
        var g = Math.min(1, dt / CAM_F_TAU);
        theta += (CAM_F_THETA - theta) * g;
        phi += (CAM_F_PHI - phi) * g;
        radiusPct += (CAM_F_RADIUS_PCT - radiusPct) * g;
        fovDeg += (CAM_FOV_END - fovDeg) * g;
        try {
          var curScale = mv.timeScale || 0;
          mv.timeScale = Math.max(0, curScale - dt * CAM_GLTF_SCALE / CAM_F_TAU);
        } catch (e) {}
        mv.setAttribute("camera-orbit", theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + radiusPct.toFixed(2) + "%");
        try { mv.setAttribute("field-of-view", fovDeg.toFixed(2) + "deg"); } catch (e2) {}
        /* 3D → 2D 平面化：定格稳定后触发 2D 图标浮现、3D 场景失焦淡出 */
        if (!flat && ts - finaleAt >= CAM_FLAT_MS) {
          flat = true;
          card.classList.add("is-flat");
          phaseState = "flat";
          applyPhaseText();
        }
        return;
      }

      /* 阶段一：平视 → 俯视（指数收敛）+ 加速后匀速环绕 */
      var t = (ts - resumeAt) / 1000;
      /* 环绕减速窗口：提前缓动对准正面定格角，避免 finale 生硬急转（电影感减速收镜） */
      if (ts - resumeAt >= CAM_DECEL_AT) {
        var dg = Math.min(1, dt / 0.95);
        theta += (CAM_F_THETA - theta) * dg;
        phi += (CAM_F_PHI - phi) * Math.min(1, dt / CAM_PHI_TAU);
        try {
          var ds = mv.timeScale || 0;
          mv.timeScale = Math.max(0, ds - dt * CAM_GLTF_SCALE / 1.6);
        } catch (e) {}
        mv.setAttribute("camera-orbit", theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + radiusPct.toFixed(2) + "%");
        return;
      }
      var ramp = t <= 0 ? 0 : 1 - Math.exp(-t / CAM_ACCEL_TAU);
      theta += CAM_SPIN_MAX * ramp * dt;
      if (phi > CAM_PHI_TOP + 0.05) {
        phi += (CAM_PHI_TOP - phi) * Math.min(1, dt / CAM_PHI_TAU);
      } else {
        phi = CAM_PHI_TOP;
      }
      try { mv.timeScale = CAM_GLTF_SCALE * ramp; } catch (e) {}
      mv.setAttribute("camera-orbit", theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + radiusPct.toFixed(2) + "%");
    }

    mv.addEventListener("pointerdown", function () { intent = true; }, { passive: true });
    function release() {
      if (!intent) return;
      intent = false;
      if (finale) return; /* 已定格：不再恢复环绕 */
      idleUntil = performance.now() + CAM_RESUME_MS;
      resumeAt = idleUntil;
    }
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });

    window.requestAnimationFrame(frame);
  }

  function initModel() {
    var stage = document.getElementById("lp-stage");
    var tpl = document.getElementById("lp-model-tpl");
    if (!stage || !tpl) return;

    /* WebGL 不可用：保持静态占位（程序化地球剪影 + 轨道），零控制台报错 */
    if (!webglSupported()) {
      var card = document.getElementById("lp-card");
      if (card) {
        card.classList.add("is-finale");
        card.classList.add("is-ready");
      }
      return;
    }

    var cores = navigator.hardwareConcurrency || 8;
    var mem = navigator.deviceMemory || 8;
    var weak = cores <= 4 || mem <= 4;

    /* ---- 3D 展台（地球 + 环绕 + 双手捧起）----
       v1 速度优化：model-viewer 组件改为按需动态 import。等待 window load 后延迟片刻
       再加载组件（约 1.02MB）并实例化；期间保持 .lp-static 静态占位（程序化地球剪影 + 轨道），
       不白屏、无布局跳动。模板 loading="lazy" 双保险：HDR/地球贴图（约 7MB）在组件进入视口后
       才拉取，不再随页面初始请求下载。 */
    function boot3D() {
      import("../vendor/model-viewer/model-viewer.min.js").then(function () {
        var mv = tpl.content.firstElementChild.cloneNode(true);
        clampViewer(mv, weak);
        stage.appendChild(mv);

        var t0 = performance.now();
        mv.addEventListener("load", function () {
          mv.setAttribute("data-load-ms", String(Math.round(performance.now() - t0)));
          stage.classList.add("is-ready");
          paintTrackLine(mv, root.getAttribute("data-theme"));
          initCameraRig(mv, weak);
        });

        function applyTheme() {
          var light = root.getAttribute("data-theme") === "light";
          if (!weak) {
            mv.setAttribute("exposure", light ? "0.98" : "1.05");
            mv.setAttribute("shadow-intensity", light ? "1.15" : "1.45");
            mv.setAttribute("shadow-softness", light ? "0.85" : "0.70");
          }
          paintTrackLine(mv, light ? "light" : "dark");
        }
        applyTheme();
        if (window.MutationObserver) {
          new MutationObserver(applyTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
        }
      }).catch(function (err) {
        /* 组件按需加载失败：保持 .lp-static 静态占位，零白屏、零未捕获报错 */
        if (window.console) console.warn("model-viewer 按需加载失败，保持静态降级占位");
      });
    }

    /* 触发时机：window load 完成后延迟 400ms（首屏内容先渲染；进入 3D 视图/交互后仍会正常加载渲染） */
    function schedule3D() {
      if (document.readyState === "complete") {
        window.setTimeout(boot3D, 400);
        return;
      }
      window.addEventListener("load", function () {
        window.setTimeout(boot3D, 400);
      }, { once: true });
    }
    schedule3D();
  }

  function init() {
    initTheme();
    initModel();
    applyPhaseText();
    var langBtn = document.querySelector("[data-lang-toggle]");
    if (langBtn) langBtn.addEventListener("click", function () {
      setTimeout(applyPhaseText, 60);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
