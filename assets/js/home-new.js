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

  /* ---------- 柔光氛围：光晕随指针微移 + 卡片局部柔光 ---------- */
  function initAmbient() {
    if (reduce || !finePointer) return;

    var glow = document.querySelector(".tk-orb-glow");
    var panels = Array.prototype.slice.call(
      document.querySelectorAll(".tk-card, .tk-skill, .tk-about-card, .tk-orb-panel, .tk-cta .tk-shell")
    );
    var raf = 0, px = 0, py = 0;
    var stage = document.querySelector(".tk-orb-panel");

    function render() {
      raf = 0;
      if (glow) {
        glow.style.transform = "translate3d(" + (px * 16).toFixed(2) + "px," + (py * 11).toFixed(2) + "px,0)";
      }
      if (stage) {
        /* 前景体积感：托盘随指针做极小 3D 倾斜，球面柔光同步游走 */
        stage.style.setProperty("--tk-rx", (-py * 2.1).toFixed(2) + "deg");
        stage.style.setProperty("--tk-ry", (px * 2.6).toFixed(2) + "deg");
        stage.style.setProperty("--tk-lx", (px * 26).toFixed(1) + "px");
        stage.style.setProperty("--tk-ly", (py * 22).toFixed(1) + "px");
      }
    }

    window.addEventListener("pointermove", function (e) {
      px = (e.clientX / window.innerWidth - 0.5) * 2;
      py = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = window.requestAnimationFrame(render);
    }, { passive: true });

    panels.forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        el.style.setProperty("--tk-mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
        el.style.setProperty("--tk-my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
      }, { passive: true });
    });
  }

  /* ---------- GSAP 动效（缺失时静默降级，内容始终可见） ---------- */
  function initMotion() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (reduce) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(".tk-anim").forEach(function (el, i) {
      gsap.fromTo(el,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.08 * i + 0.1, ease: "power2.out", overwrite: true }
      );
    });

    gsap.utils.toArray(".tk-anim-scroll").forEach(function (el) {
      gsap.fromTo(el,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    gsap.to("#tk-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
    });
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

  /* ---------- 首屏相机装配：视角动画「平视 ⇄ 俯视」往复 ----------
     - 相机由本装配逐帧统一驱动：theta 方位环绕（12deg/s，等效原 auto-rotate）+ phi 俯仰往复（余弦周期曲线）
     - phi 每帧向曲线目标指数收敛：起点无论落在曲线哪一段（含用户拖拽后的残留姿态），都连续逼近，永不跳变
     - 用户在 3D 主视觉上拖拽时暂停自动驱动并跟随其姿态，松手 2s 后自动续接
     - prefers-reduced-motion：不启动驱动，移除自动环绕并锁定平视静态视角
     - 每帧写一次 camera-orbit（interpolation-decay=0 即时到位），帧间即为连续平滑过渡 */
  var CAM_PHI_LEVEL = 78;      /* 平视：视线接近水平（保留 12° 俯角） */
  var CAM_PHI_TOP = 26;        /* 俯视：自上方俯瞰轨道面 */
  var CAM_CYCLE_MS = 14000;    /* 平视 → 俯视 → 平视 一次完整往复 */
  var CAM_SPIN_DEG_S = 12;     /* 方位环绕速度，与原 rotation-per-second 一致 */
  var CAM_RESUME_MS = 2000;    /* 拖拽结束后恢复自动视角的等待 */
  var CAM_FOLLOW = 3.5;        /* phi 向周期曲线收敛速率（1/s），越小越柔 */
  var CAM_RADIUS = "100%";

  function initCameraRig(mv) {
    /* 相机改由本装配驱动，移除声明式自动环绕，避免两套驱动互相覆盖 */
    mv.removeAttribute("auto-rotate");

    if (reduce) {
      /* 动效减弱：静态平视视角，不做任何自动视角变化 */
      mv.setAttribute("camera-orbit", "-27deg " + CAM_PHI_LEVEL + "deg " + CAM_RADIUS);
      return;
    }

    var mid = (CAM_PHI_LEVEL + CAM_PHI_TOP) / 2;
    var amp = (CAM_PHI_LEVEL - CAM_PHI_TOP) / 2;
    var theta = -27;
    var phi = CAM_PHI_LEVEL;
    var t0 = performance.now();
    var last = 0;
    var idleUntil = 0;
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
        /* 拖拽中 / 刚松手：跟随用户留下的姿态，保证续接处连续无跳变 */
        var cur = readOrbit();
        if (cur) { theta = cur.theta; phi = cur.phi; }
        return;
      }

      theta += CAM_SPIN_DEG_S * dt;
      var goal = mid + amp * Math.cos((ts - t0) / CAM_CYCLE_MS * Math.PI * 2);
      phi += (goal - phi) * Math.min(1, dt * CAM_FOLLOW);
      mv.setAttribute("camera-orbit", theta.toFixed(2) + "deg " + phi.toFixed(2) + "deg " + CAM_RADIUS);
    }

    mv.addEventListener("pointerdown", function () { intent = true; }, { passive: true });
    function release() {
      if (!intent) return;
      intent = false;
      idleUntil = performance.now() + CAM_RESUME_MS;
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

    /* ---- 首屏主视觉：完整轨道系统 3D ---- */
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
  }

  function init() {
    initTheme();
    initYear();
    initAmbient();
    initMotion();
    initModel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
