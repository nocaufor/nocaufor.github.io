/* ============================================================
   NOCAU 首页交互 · home-new.js
   主题切换与站点公共机制保持一致（html[data-theme] + localStorage nocau-theme）
   柔光氛围（指针联动，仅桌面 + 未开启减弱动效）
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

    function render() {
      raf = 0;
      if (glow) {
        glow.style.transform = "translate3d(" + (px * 16).toFixed(2) + "px," + (py * 11).toFixed(2) + "px,0)";
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

  function init() {
    initTheme();
    initYear();
    initAmbient();
    initMotion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
