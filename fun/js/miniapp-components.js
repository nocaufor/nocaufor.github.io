/* miniapp-components.js：在线演示 —— 评分组件（toggle/percent）+ 防抖按钮（leading+trailing，800ms）
   与工程 components/rating、components/debounce-button 同一套逻辑的浏览器版（CSP 兼容，无内联） */
(function () {
  "use strict";

  /* rating-core：toggle / percent / starList（与工程纯逻辑层一致） */
  function clamp(v, lo, hi) {
    v = Number(v);
    if (isNaN(v)) return lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }
  function toggle(current, index, max) {
    var cur = clamp(current, 0, max);
    var idx = clamp(index, 0, max);
    return idx === cur ? 0 : idx;
  }
  function percent(value, max) {
    if (!max || max <= 0) return 0;
    return Math.round(clamp(value, 0, max) / max * 100);
  }
  function starList(max) {
    var list = [];
    for (var i = 1; i <= max; i++) list.push(i);
    return list;
  }

  /* debounce-core：createDebouncer（leading + trailing，真实 setTimeout） */
  function createDebouncer(wait, fn) {
    var timer = null;
    var last = -Infinity;
    var pending = null;
    function invoke(args) {
      last = Date.now();
      timer = null;
      pending = null;
      fn.apply(null, args || []);
    }
    return {
      call: function () {
        var args = Array.prototype.slice.call(arguments);
        var t = Date.now();
        if (t - last >= wait) { invoke(args); return true; }
        pending = args;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () { if (pending) invoke(pending); }, wait - (t - last));
        return false;
      },
      cancel: function () { if (timer) clearTimeout(timer); timer = null; pending = null; }
    };
  }

  var MAX = 5, WAIT = 800;
  var score = 3;

  function $(id) { return document.getElementById(id); }

  function renderStars() {
    var box = $("mc-stars");
    if (!box) return;
    box.textContent = "";
    starList(MAX).forEach(function (n) {
      var s = document.createElement("span");
      s.setAttribute("role", "radio");
      s.setAttribute("aria-label", n + " 星");
      s.setAttribute("data-n", String(n));
      s.textContent = "★";
      s.style.cssText = "font-size:30px;cursor:pointer;padding:0 5px;line-height:1;" +
        (n <= score ? "color:var(--brand-text,var(--brand));" : "color:var(--text-soft);opacity:.45;");
      s.addEventListener("click", function () {
        score = toggle(score, n, MAX);
        renderStars();
        $("mc-score").textContent = String(score);
        $("mc-percent").textContent = percent(score, MAX) + "%";
        log("rating:change → " + score + "（" + percent(score, MAX) + "%）");
      });
      box.appendChild(s);
    });
  }

  function log(text) {
    var box = $("mc-log");
    if (!box) return;
    var line = document.createElement("div");
    line.textContent = "· " + text;
    box.insertBefore(line, box.firstChild);
    while (box.children.length > 8) box.removeChild(box.lastChild);
  }
  function setStatus(text) { var el = $("mc-status"); if (el) el.textContent = text; }

  var tapped = 0, fired = 0;
  var deb;

  function init() {
    if (!$("mc-demo")) return;
    renderStars();
    $("mc-score").textContent = String(score);
    $("mc-percent").textContent = percent(score, MAX) + "%";
    $("mc-tapped").textContent = "0";
    $("mc-fired").textContent = "0";
    setStatus("就绪：点击星星评分；防抖按钮窗口 800ms（leading + trailing）。");

    var btn = $("mc-deb-btn");
    if (btn) {
      deb = createDebouncer(WAIT, function () {
        fired += 1;
        $("mc-fired").textContent = String(fired);
        setStatus("防抖尾随触发 → 实际触发第 " + fired + " 次");
        log("debounce:action → 第 " + fired + " 次（窗口 " + WAIT + "ms）");
      });
      btn.addEventListener("click", function () {
        tapped += 1;
        $("mc-tapped").textContent = String(tapped);
        var immediate = deb.call();
        setStatus(immediate ? "窗口外首击 → 立即触发（点击 " + tapped + " 次）" : "窗口内连点 → 合并等待尾随（点击 " + tapped + " 次）");
      });
    }

    var reset = $("mc-reset");
    if (reset) reset.addEventListener("click", function () {
      tapped = 0; fired = 0;
      if (deb) deb.cancel();
      $("mc-tapped").textContent = "0";
      $("mc-fired").textContent = "0";
      setStatus("已重置统计。");
      log("已重置点击/触发统计");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
