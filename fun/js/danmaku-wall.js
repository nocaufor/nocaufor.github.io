/* danmaku-wall：弹幕留言墙（CSP 兼容，无内联） */
(function () {
  "use strict";
  var stage = document.getElementById("dm-stage");
  var input = document.getElementById("dm-input");
  var sendBtn = document.getElementById("dm-send");
  var clearBtn = document.getElementById("dm-clear");
  var bgEl = stage.querySelector(".dm-bg");

  var COLORS = ["#6fb3a8", "#7aa2f7", "#e0af68", "#f7768e", "#9ece6a"];
  var count = 0;

  function fire(text) {
    if (!text) return;
    if (bgEl) bgEl.style.display = "none";
    var el = document.createElement("div");
    el.className = "dm-item";
    el.textContent = text;
    el.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    el.style.top = (6 + Math.random() * 78) + "%";
    el.style.fontSize = (0.9 + Math.random() * 0.25) + "rem";
    stage.appendChild(el);

    var speed = 80 + Math.random() * 130;
    var startX = stage.clientWidth;
    var endX = -el.offsetWidth - 20;
    el.style.left = "0px";
    el.style.transform = "translateX(" + startX + "px)";
    var x = startX, last = performance.now();

    (function step(now) {
      var dt = (now - last) / 1000;
      last = now;
      x -= speed * dt;
      el.style.transform = "translateX(" + x + "px)";
      if (x > endX) requestAnimationFrame(step);
      else el.remove();
    })(last);
    count += 1;
  }

  sendBtn.addEventListener("click", function () {
    fire(input.value.trim());
    input.value = "";
    input.focus();
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { fire(input.value.trim()); input.value = ""; }
  });
  clearBtn.addEventListener("click", function () {
    stage.querySelectorAll(".dm-item").forEach(function (el) { el.remove(); });
    if (bgEl) bgEl.style.display = "";
  });
  document.querySelectorAll("[data-dm]").forEach(function (b) {
    b.addEventListener("click", function () { fire(b.getAttribute("data-dm")); });
  });
})();
