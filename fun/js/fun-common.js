/* nocau Fun 通用脚本：主题切换 / 页脚年份（CSP 兼容，无内联） */
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

  /* 页脚年份 */
  var y = $("#year");
  if (y) y.textContent = String(new Date().getFullYear());
})();
