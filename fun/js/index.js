/* nocau 代码开发合集：分类筛选（CSP 兼容，无内联事件） */
(function () {
  "use strict";
  var filterBar = document.getElementById("fun-filters");
  if (!filterBar) return;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".fun-card"));
  var countEl = document.getElementById("fun-count");

  function applyFilter(filter) {
    var shown = 0;
    cards.forEach(function (card) {
      var cat = card.getAttribute("data-cat") || "classic";
      var match = filter === "all" || cat === filter;
      card.style.display = match ? "" : "none";
      if (match) shown += 1;
    });
    Array.prototype.forEach.call(filterBar.querySelectorAll(".btn"), function (btn) {
      var isActive = btn.getAttribute("data-filter") === filter;
      btn.classList.toggle("is-active", isActive);
    });
    if (countEl) countEl.textContent = "共 " + shown + " / " + cards.length + " 个可运行页面";
  }

  filterBar.addEventListener("click", function (ev) {
    var btn = ev.target.closest ? ev.target.closest("button[data-filter]") : null;
    if (!btn) return;
    applyFilter(btn.getAttribute("data-filter"));
  });

  /* 默认全部分组（URL 锚点支持，如 #security） */
  var anchor = (location.hash || "").replace("#", "");
  var valid = ["all", "classic", "tool", "miniapp", "auto", "mcu", "crawler", "security", "frontier", "knowledge"];
  applyFilter(valid.indexOf(anchor) !== -1 ? anchor : "all");
})();
