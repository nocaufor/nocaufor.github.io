/* 滚动回忆录：时间线滚动浮现 */
(function () {
  "use strict";
  var scroller = document.getElementById("memory-scroll");
  if (!scroller) return;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = [
    { t: "2019 · 春", h: "出发", p: "第一次离开小镇，火车窗外是陌生的田野。" },
    { t: "2020 · 冬", h: "第一行代码", p: "深夜的编辑器里，Hello World 亮起。" },
    { t: "2021 · 夏", h: "遇见", p: "在某个社团活动上，认识了后来最好的朋友。" },
    { t: "2022 · 秋", h: "第一次独立项目", p: "从 0 到 1 做完一个小站，上线那一刻很激动。" },
    { t: "2023 · 冬", h: "低谷", p: "有一段路走得很难，但还好没有放弃。" },
    { t: "2024 · 春", h: "重生", p: "重新整理自己，学会与不确定性共处。" },
    { t: "2025 · 夏", h: "现在", p: "把热爱做成作品，把日子过成自己喜欢的样子。" }
  ];
  items.forEach(function (it) {
    var el = document.createElement("div");
    el.className = "memory-item";
    el.innerHTML = '<span class="m-time">' + it.t + '</span><h3>' + it.h + '</h3><p>' + it.p + '</p>';
    scroller.appendChild(el);
  });
  var all = scroller.querySelectorAll(".memory-item");

  function check() {
    var rect = scroller.getBoundingClientRect();
    all.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < rect.bottom - 40) el.classList.add("is-visible");
    });
  }
  scroller.addEventListener("scroll", check, { passive: true });
  check();
})();
