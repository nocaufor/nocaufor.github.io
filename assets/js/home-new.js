/* ============================================================
   NOCAU 首页交互 · home-new.js
   主题切换与站点公共机制保持一致（html[data-theme] + localStorage nocau-theme）
   GSAP 入场 / 滚动动效 / 进度条（缺失时页面保持可见，优雅降级）
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "nocau-theme";

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

  /* ---------- GSAP 动效（缺失时静默降级，内容始终可见） ---------- */
  function initMotion() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    /* Hero 入场 */
    gsap.utils.toArray(".tk-anim").forEach(function (el, i) {
      gsap.fromTo(el,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.08 * i + 0.1, ease: "power2.out", overwrite: true }
      );
    });

    /* 滚动入场：卡片 / 区块 */
    gsap.utils.toArray(".tk-anim-scroll").forEach(function (el) {
      gsap.fromTo(el,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    /* 顶部进度条 */
    gsap.to("#tk-progress", {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
    });
  }

  function init() {
    initTheme();
    initYear();
    initMotion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
