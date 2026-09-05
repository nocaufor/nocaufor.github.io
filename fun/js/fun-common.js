/* nocau Fun 通用脚本：主题切换 / 移动导航 / 页脚年份（CSP 兼容，无内联） */
(function () {
  "use strict";
  function $(s, c) { return (c || document).querySelector(s); }

  /* 主题切换 */
  var btn = $("#theme-toggle");
  if (btn) {
    var sun = $(".icon-sun", btn);
    var moon = $(".icon-moon", btn);
    function sync(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem("nocau-theme", theme); } catch (e) {}
      if (sun) sun.style.display = theme === "dark" ? "none" : "block";
      if (moon) moon.style.display = theme === "dark" ? "block" : "none";
    }
    var saved = null;
    try { saved = localStorage.getItem("nocau-theme"); } catch (e) {}
    sync(saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      sync(cur);
    });
  }

  /* 移动导航（子页面无 main.js 时兜底） */
  var navToggle = $(".nav-toggle");
  var navLinks = $("#nav-links");
  function closeNav() {
    if (navLinks && navLinks.classList.contains("open")) {
      navLinks.classList.remove("open");
      if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }
  }
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !navLinks.classList.contains("open");
      navLinks.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.classList.toggle("nav-open", open);
    });
    var links = navLinks.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) links[i].addEventListener("click", closeNav);
    document.addEventListener("click", function (e) {
      if (!navLinks.classList.contains("open")) return;
      if (e.target && e.target.closest && (e.target.closest("#nav-links") || e.target.closest(".nav-toggle"))) return;
      closeNav();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNav(); });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && navLinks.classList.contains("open")) closeNav();
    }, { passive: true });
  }

  /* 页脚年份 */
  var y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
