/* 倒计时 */
(function () {
  "use strict";
  var label = document.getElementById("countdown-label");
  var daysEl = document.getElementById("cd-days");
  var hoursEl = document.getElementById("cd-hours");
  var minsEl = document.getElementById("cd-mins");
  var secsEl = document.getElementById("cd-secs");
  var input = document.getElementById("countdown-date");
  var btn = document.getElementById("countdown-start");
  if (!daysEl) return;
  var target = null, timer = null;

  function fmt(n) { return String(n).padStart(2, "0"); }
  function tick() {
    if (!target) return;
    var diff = target - Date.now();
    if (diff <= 0) {
      daysEl.textContent = "0"; hoursEl.textContent = "00"; minsEl.textContent = "00"; secsEl.textContent = "00";
      if (label) label.textContent = "时间到了！";
      if (timer) { clearInterval(timer); timer = null; }
      return;
    }
    var d = Math.floor(diff / 86400000);
    var h = Math.floor((diff % 86400000) / 3600000);
    var m = Math.floor((diff % 3600000) / 60000);
    var s = Math.floor((diff % 60000) / 1000);
    daysEl.textContent = String(d);
    hoursEl.textContent = fmt(h);
    minsEl.textContent = fmt(m);
    secsEl.textContent = fmt(s);
  }
  function start() {
    if (!input || !input.value) {
      if (label) label.textContent = "请先选择一个目标日期";
      return;
    }
    var d = new Date(input.value + "T00:00:00");
    if (isNaN(d.getTime())) return;
    target = d.getTime();
    if (label) label.textContent = "距离 " + input.value + " 还有";
    if (timer) clearInterval(timer);
    tick();
    timer = setInterval(tick, 1000);
  }
  if (btn) btn.addEventListener("click", start);
  // 默认：下一个元旦
  var now = new Date();
  var ny = new Date(now.getFullYear() + 1, 0, 1);
  if (input) input.value = ny.getFullYear() + "-01-01";
  start();
})();
