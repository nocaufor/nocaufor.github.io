/* ============================================================
   NOCAU 首页交互 · home-new.js
   主题切换与站点公共机制保持一致（html[data-theme] + localStorage nocau-theme）
   柔光氛围（指针联动，仅桌面 + 未开启减弱动效）
   首屏 3D：主视觉与下方图标立体版（本地 model-viewer + 站点自有 glTF 轨道几何）
   GSAP 入场 / 滚动动效 / 进度条（缺失时页面保持可见，优雅降级）
   零依赖、零构建，GitHub Pages 直接可用。
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "nocau-theme";
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var finePointer = !!(window.matchMedia && window.matchMedia("(pointer: fine)").matches);

  function syncThemeIcons(theme) {
    var sun = document.querySelector("#theme-toggle .icon-sun");
    var moon = document.querySelector("#theme-toggle .icon-moon");
    if (sun) sun.style.display = theme === "light" ? "" : "none";
    if (moon) moon.style.display = theme === "dark" ? "" : "none";
  }

  /* ---------- 主题初始化 / 切换（与子页共享的 nocau-theme 存储） ---------- */
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

  /* ---------- 年份 ---------- */
  function initYear() {
    var el = document.getElementById("tk-year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- 首屏 3D（本地 model-viewer 组件 + 站点自有 glTF 轨道几何，含降级与主题联动） ---------- */
  function webglSupported() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  /* 主题随动材质：
     - TrackLine：轨道细线，浅色主题取深墨、深色主题取亮银（与 --hero-ink 同向）
     - SatinMetal：太阳球体本身，深色主题略压暗，令亮银轨道线获得足够对比度
     注：太阳表面经纬网格（GridLine）已按需求移除，模型内不再包含该材质 */
  var TRACK_LINE_HEX = { light: 0x2b2e33, dark: 0xe2e6ec };
  var SATIN_METAL_HEX = { light: 0xeef1f6, dark: 0x6d747e };
  var THEMED_MATERIALS = {
    TrackLine: TRACK_LINE_HEX,
    SatinMetal: SATIN_METAL_HEX,
  };

  function paintTrackLine(mv, theme) {
    if (!mv) return;
    var key = theme === "light" ? "light" : "dark";
    try {
      var model = mv.model;
      if (!model || !model.materials) return;
      Array.prototype.forEach.call(model.materials, function (m) {
        if (!m || !m.name) return;
        if (!Object.prototype.hasOwnProperty.call(THEMED_MATERIALS, m.name)) return;
        var f = hexToLinearFactor(THEMED_MATERIALS[m.name][key]);
        try {
          /* model-viewer 的 Material API：baseColorFactor 为 linear-sRGB 的 [r,g,b,a] */
          m.pbrMetallicRoughness.baseColorFactor = f;
        } catch (e2) {
          try { m.pbrMetallicRoughness.setBaseColorFactor(f); } catch (e3) {}
        }
      });
    } catch (e) {}
  }

  /* sRGB 十六进制 → linear-sRGB 因子（glTF baseColorFactor 的色彩空间要求） */
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

  /* 低端设备降级：关闭自动旋转与相机交互、减弱阴影（保留静态体积感与接触阴影） */
  function clampViewer(mv, weak) {
    if (!weak) return;
    mv.removeAttribute("auto-rotate");
    mv.removeAttribute("camera-controls");
    mv.setAttribute("interaction-policy", "none");
    mv.setAttribute("shadow-intensity", "0.6");
    mv.setAttribute("exposure", "1");
  }

  /* ---------- 首屏相机装配：视角动画「平视 → 俯视 · 加速后匀速环绕」 ----------
     - 加载后 phi 从平视 78° 一次性丝滑过渡到俯视 26°（指数收敛 ~4s 到位），到位后恒定保持俯视
     - theta 方位环绕沿 ease-out 加速曲线由慢到快再匀速（时间常数 1.2s），匀速速度提升到 24deg/s
     - glTF 自转/公转同步提速：time-scale 沿同一条加速曲线从 0 平滑升到 2 倍，进入匀速后恒为 2 倍
     - 用户在 3D 主视觉上拖拽时暂停自动驱动并跟随其姿态，松手 2s 后速度从 0 重新缓升续接
     - prefers-reduced-motion：不启动驱动，锁定平视静态视角
     - 每帧写一次 camera-orbit（interpolation-decay=0 即时到位）与 time-scale，帧间连续无跳变 */
  var CAM_PHI_LEVEL = 78;      /* 平视：视线接近水平（保留 12° 俯角），reduced-motion 静态位 */
  var CAM_PHI_TOP = 26;        /* 俯视：自上方俯瞰轨道面，动画到位后的常驻视角 */
  var CAM_PHI_TAU = 1.2;       /* 平视 → 俯视 收敛时间常数（秒），越大越柔 */
  var CAM_SPIN_MAX = 24;       /* 环绕匀速速度 deg/s（原 12 → 24，整体加快） */
  var CAM_ACCEL_TAU = 1.2;     /* 加速曲线时间常数（秒）：由慢到快进入匀速的缓升节奏 */
  var CAM_GLTF_SCALE = 2;      /* glTF 动画（太阳自转 + 地月公转）目标倍速 */
  var CAM_RESUME_MS = 2000;    /* 拖拽结束后恢复自动视角的等待 */
  var CAM_RADIUS = "100%";

  function initCameraRig(mv) {
    /* 相机改由本装配驱动，移除声明式自动环绕，避免两套驱动互相覆盖 */
    mv.removeAttribute("auto-rotate");

    if (reduce) {
      /* 动效减弱：静态平视视角，不做任何自动视角变化 */
      mv.setAttribute("camera-orbit", "-27deg " + CAM_PHI_LEVEL + "deg " + CAM_RADIUS);
      return;
    }

    var theta = -27;
    var phi = CAM_PHI_LEVEL;
    var t0 = performance.now();
    var last = 0;
    var idleUntil = 0;
    var resumeAt = t0;    /* 速度曲线爬升起点（首启即 t0；续接时置为 idleUntil） */
    var intent = false;   /* 用户是否正按住拖拽 */

    function readOrbit() {
      if (typeof mv.getCameraOrbit !== "function") return null;
      try {
        var o = mv.getCameraOrbit();
        if (!o) return null;
        return { theta: o.theta * 180 / Math.PI, phi: o.phi * 180 / Math.PI };
      } catch (e) { return null; }
    }

    function frame(ts) {
      window.requestAnimationFrame(frame);
      var dt = last ? Math.min(0.06, (ts - last) / 1000) : 0;
      last = ts;

      if (intent || ts < idleUntil) {
        /* 拖拽中 / 刚松手：跟随用户留下的姿态并冻结 glTF 动画，保证续接处位置连续无跳变 */
        var cur = readOrbit();
        if (cur) { theta = cur.theta; phi = cur.phi; }
        try { mv.timeScale = 0; } catch (e) {}
        return;
      }

      /* 加速曲线：速度倍率 0 → 1 指数缓升（ease-out 进入匀速），任意起点连续 */
      var t = (ts - resumeAt) / 1000;
      var ramp = t <= 0 ? 0 : 1 - Math.exp(-t / CAM_ACCEL_TAU);

      theta += CAM_SPIN_MAX * ramp * dt;

      /* 平视 → 俯视一次性过渡（指数收敛），到位后恒定俯视 */
      if (phi > CAM_PHI_TOP + 0.05) {
        phi += (CAM_PHI_TOP - phi) * Math.min(1, dt / CAM_PHI_TAU);
      } else {
        phi = CAM_PHI_TOP;
      }

      /* glTF 动画倍速同曲线：0 → 2 倍 */
      try { mv.timeScale = CAM_GLTF_SCALE * ramp; } catch (e) {}

      mv.setAttribute("camera-orbit", theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + CAM_RADIUS);
    }

    mv.addEventListener("pointerdown", function () { intent = true; }, { passive: true });
    function release() {
      if (!intent) return;
      intent = false;
      idleUntil = performance.now() + CAM_RESUME_MS;
      resumeAt = idleUntil;   /* 续接后速度从 0 重新缓升，杜绝速率突跳 */
    }
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });

    window.requestAnimationFrame(frame);
  }

  function initModel() {
    var panel = document.querySelector(".tk-orb-panel");
    var stage = document.querySelector(".tk-orb-stage");
    var tpl = document.getElementById("tk-model-tpl");
    /* 全页只保留一处 3D 轨道图标：首屏主视觉（首屏下方文本旁的徽章位图标及其容器已整体移除）。 */
    if (!panel || !stage || !tpl) return;

    /* WebGL 不可用：不实例化 3D 组件，保持 .tk-no-3d 静态占位与 CSS 轨道图标（零控制台报错） */
    if (!webglSupported()) return;

    var cores = navigator.hardwareConcurrency || 8;
    var mem = navigator.deviceMemory || 8;
    var weak = cores <= 4 || mem <= 4;

    /* ---- 首屏主视觉：完整轨道系统 3D ----
       v1 速度优化：model-viewer 组件由同步模块加载改为按需动态 import。
       等待 window load（首屏文字/CSS 优先渲染）后再延迟片刻加载组件（约 1.02MB）并实例化；
       期间保持 .tk-no-3d 静态占位，不白屏、无布局跳动。模板 loading="lazy" 双保险：
       组件进入视口后才拉取 glTF/HDRI（首屏 3D 资源不再随页面初始请求下载，约 1.8MB → 按需）。 */
    function boot3D() {
      import("../vendor/model-viewer/model-viewer.min.js").then(function () {
        var mv = tpl.content.firstElementChild.cloneNode(true);
        clampViewer(mv, weak);
        stage.appendChild(mv);

        /* 首帧耗时观测：写入 data-load-ms，便于自检与汇报；同时让 CSS 静态占位淡出、交棒真 3D */
        var t0 = performance.now();
        mv.addEventListener("load", function () {
          mv.setAttribute("data-load-ms", String(Math.round(performance.now() - t0)));
          panel.classList.remove("tk-no-3d");
          paintTrackLine(mv, root.getAttribute("data-theme"));
          /* 模型就绪后接管相机：启动「平视 ⇄ 俯视」往复视角动画（模板初始姿态即平视，衔接处零跳变） */
          initCameraRig(mv);
        });

        /* 主题联动：环境为本地摄影棚 HDRI（缎面金属：釉面高光 + 环境反射层次）。
           浅色为高调白场（略提曝光、柔和接触阴影）；深色略降曝光、加强接触阴影并压低高光余量，避免金属过曝。
           接触阴影同步加强，让球体与轨道在展台上"落得住"，强化三维立体纵深 */
        function applyTheme() {
          var light = root.getAttribute("data-theme") === "light";
          if (!weak) {
            mv.setAttribute("exposure", light ? "1.02" : "0.98");
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
        /* 组件按需加载失败：保持 .tk-no-3d 静态占位，零白屏、零未捕获报错 */
        if (window.console) console.warn("model-viewer 按需加载失败，保持静态降级占位");
      });
    }

    /* 触发时机：window load 完成后延迟 400ms（首屏内容先渲染；滚动/交互后仍会正常加载渲染） */
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
    initYear();
    initModel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
