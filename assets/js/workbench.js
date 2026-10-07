/* 隐秘工作台入口（纯本地，无外部依赖）
 * 触发方式（普通访客无感，不进入任何导航）：
 *   1) 访问 URL 带 ?workbench 参数 → 跳转 workbench.html
 *   2) 页脚版权行连点 3 次（800ms 窗口内）→ 跳转 workbench.html
 */
(function () {
  "use strict";

  /* 依据当前页面引用的 workbench.js 相对路径，推算站点根（相对当前页面） */
  function siteRoot() {
    var s = document.querySelector('script[src*="workbench.js"]');
    var src = s ? (s.getAttribute("src") || "") : "";
    if (!src) return "";
    var dir = src.substring(0, src.lastIndexOf("/") + 1); // 形如 assets/js/ 或 ../assets/js/
    var parts = dir.split("/");
    while (parts.length && parts[parts.length - 1] === "") parts.pop(); // 去末尾空串
    parts.pop(); // js
    parts.pop(); // assets
    var base = parts.join("/");
    return base ? base + "/" : "";
  }

  function openWorkbench() {
    if (location.pathname.split("/").pop() === "workbench.html") return;
    location.replace(siteRoot() + "workbench.html");
  }

  var opened = false;
  function openOnce() {
    if (opened) return;
    opened = true;
    openWorkbench();
  }

  /* 1) URL 参数触发 */
  try {
    if (new URLSearchParams(window.location.search).has("workbench")) {
      openOnce();
      return;
    }
  } catch (e) {}

  /* 2) 版权行连点 3 次触发 */
  var clicks = 0;
  var lastTs = 0;
  document.addEventListener(
    "click",
    function (e) {
      if (opened) return;
      var el = e.target;
      if (!el || !el.closest) return;
      var footer = el.closest("footer");
      if (!footer) return;
      var txt = "";
      var walk = el;
      while (walk && walk !== footer) {
        if (walk.textContent) {
          txt = walk.textContent.trim();
          break;
        }
        walk = walk.parentElement;
      }
      if (!txt) return;
      if (!/©|nocau\.com|copyright/i.test(txt)) return;
      var now = Date.now();
      if (now - lastTs > 800) clicks = 0;
      clicks += 1;
      lastTs = now;
      if (clicks >= 3) {
        clicks = 0;
        openOnce();
      }
    },
    true
  );
})();
