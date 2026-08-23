/* 回忆轮回照片墙：轮播照片墙 */
(function () {
  "use strict";
  var wall = document.getElementById("photo-wall");
  if (!wall) return;
  var status = document.getElementById("wall-status");
  var memories = [
    { emoji: "☀", caption: "第一次一起看海的那天" },
    { emoji: "☕", caption: "街角咖啡店，聊到打烊" },
    { emoji: "✦", caption: "深夜的星空与热牛奶" },
    { emoji: "✿", caption: "春天，花开得刚刚好" },
    { emoji: "♬", caption: "耳机分你一半的黄昏" },
    { emoji: "☾", caption: "所有想你的夜晚" }
  ];
  var idx = 0, timer = null;

  memories.forEach(function (m, i) {
    var slide = document.createElement("div");
    slide.className = "photo-slide" + (i === 0 ? " is-active" : "");
    slide.innerHTML =
      '<div class="photo-frame">' + m.emoji + '</div>' +
      '<p class="photo-caption">' + m.caption + '</p>' +
      '<span class="photo-index" style="font-size:0.72rem;letter-spacing:0.2em;color:var(--text-soft)">' + String(i + 1).padStart(2, "0") + ' / ' + memories.length + '</span>';
    wall.appendChild(slide);
  });

  function show(i) {
    idx = (i + memories.length) % memories.length;
    wall.querySelectorAll(".photo-slide").forEach(function (s, k) {
      s.classList.toggle("is-active", k === idx);
    });
    if (status) status.textContent = memories[idx].caption;
  }
  function next() { show(idx + 1); }
  function prev() { show(idx - 1); }

  var prevBtn = document.getElementById("wall-prev");
  var nextBtn = document.getElementById("wall-next");
  var autoBtn = document.getElementById("wall-auto");
  if (prevBtn) prevBtn.addEventListener("click", function () { stopAuto(); prev(); });
  if (nextBtn) nextBtn.addEventListener("click", function () { stopAuto(); next(); });
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; if (autoBtn) autoBtn.textContent = "自动轮播"; }
  }
  if (autoBtn) {
    autoBtn.addEventListener("click", function () {
      if (timer) { stopAuto(); if (status) status.textContent = "已停止自动轮播"; }
      else { timer = setInterval(next, 2600); autoBtn.textContent = "停止轮播"; if (status) status.textContent = "自动轮播中"; }
    });
  }
  show(0);
})();
