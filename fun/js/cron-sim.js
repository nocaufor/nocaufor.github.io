/* nocau Fun 自动化任务调度器（源自想法 C000001，CSP 兼容） */
(function () {
  "use strict";

  var nameEl = document.getElementById("cr-name");
  var exprEl = document.getElementById("cr-expr");
  var addBtn = document.getElementById("cr-add");
  var clearBtn = document.getElementById("cr-clear");
  var listEl = document.getElementById("cr-list");
  var statusEl = document.getElementById("cr-status");
  if (!listEl) return;

  var KEY = "ncCronV1";
  var jobs = [];
  try { jobs = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { jobs = []; }

  function parseField(str, max) {
    // 返回匹配函数或 null
    var parts = str.split(",").map(function (s) { return s.trim(); });
    var fns = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === "*" || p === "?") { fns.push(function () { return true; }); continue; }
      var m = /^(\d+|\*)\/(\d+)$/.exec(p);
      if (m) {
        var step = parseInt(m[2], 10);
        if (step < 1) return null;
        fns.push((function (st) {
          return function (v) { return v % st === 0; };
        })(step));
        continue;
      }
      var range = p.split("-");
      if (range.length === 2) {
        var lo = parseInt(range[0], 10), hi = parseInt(range[1], 10);
        if (isNaN(lo) || isNaN(hi) || lo > hi || hi > max) return null;
        fns.push((function (a, b) {
          return function (v) { return v >= a && v <= b; };
        })(lo, hi));
        continue;
      }
      var val = parseInt(p, 10);
      if (isNaN(val) || val > max) return null;
      fns.push((function (v2) { return function (v) { return v === v2; }; })(val));
    }
    return function (v) { return fns.some(function (f) { return f(v); }); };
  }

  function parseExpr(expr) {
    var p = expr.trim().split(/\s+/);
    if (p.length !== 5) return null;
    var min = parseField(p[0], 59);
    var hour = parseField(p[1], 23);
    var dom = parseField(p[2], 31);
    var mon = parseField(p[3], 12);
    var dow = parseField(p[4], 6);
    if (!min || !hour || !dom || !mon || !dow) return null;
    return { min: min, hour: hour, dom: dom, mon: mon, dow: dow };
  }

  function nextRuns(expr, count) {
    var f = parseExpr(expr);
    if (!f) return null;
    var now = new Date();
    var out = [];
    var d = new Date(now.getTime() + 60000);
    // 从下一分钟开始找
    d.setSeconds(0, 0);
    var guard = 0;
    while (out.length < count && guard < 200000) {
      guard++;
      var wd = d.getDay(); // 0 周日
      if (f.min(d.getMinutes()) && f.hour(d.getHours()) && f.dom(d.getDate()) && f.mon(d.getMonth() + 1) && f.dow(wd)) {
        out.push(new Date(d));
      }
      d = new Date(d.getTime() + 60000);
    }
    return out;
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(jobs)); } catch (e) {} }

  function fmt(d) {
    var pad = function (n) { return ("0" + n).slice(-2); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function render() {
    listEl.innerHTML = "";
    jobs.forEach(function (job, idx) {
      var runs = nextRuns(job.expr, 3);
      var item = document.createElement("div");
      item.className = "cr-item";
      var left = document.createElement("div");
      var t = document.createElement("div");
      t.textContent = job.name + "  ·  " + job.expr;
      t.style.fontFamily = "Consolas,monospace";
      left.appendChild(t);
      if (runs) {
        var d = document.createElement("div");
        d.className = "d";
        d.textContent = "下次：" + runs.map(fmt).join("  /  ");
        left.appendChild(d);
      } else {
        var e = document.createElement("div");
        e.className = "d cr-err";
        e.textContent = "表达式无效";
        left.appendChild(e);
      }
      item.appendChild(left);
      var del = document.createElement("span");
      del.className = "del";
      del.textContent = "✕";
      del.style.cursor = "pointer";
      del.style.opacity = ".5";
      del.addEventListener("click", function () { jobs.splice(idx, 1); save(); render(); });
      item.appendChild(del);
      listEl.appendChild(item);
    });
    statusEl.textContent = jobs.length ? "已调度 " + jobs.length + " 个任务" : "暂无任务";
  }

  function add() {
    var name = nameEl.value.trim() || "未命名任务";
    var expr = exprEl.value.trim();
    if (!parseExpr(expr)) {
      statusEl.textContent = "表达式无效，请检查格式";
      statusEl.className = "cr-status cr-err";
      return;
    }
    statusEl.className = "cr-status";
    jobs.push({ name: name, expr: expr });
    save();
    render();
  }

  addBtn.addEventListener("click", add);
  exprEl.addEventListener("keydown", function (e) { if (e.key === "Enter") add(); });
  clearBtn.addEventListener("click", function () {
    if (jobs.length && confirm("确认清空全部调度任务？")) { jobs = []; save(); render(); }
  });
  document.querySelectorAll("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      exprEl.value = b.dataset.preset;
      statusEl.textContent = "";
      statusEl.className = "cr-status";
    });
  });

  if (!jobs.length) {
    jobs = [
      { name: "备份数据库", expr: "30 2 * * 1-5" },
      { name: "健康打卡提醒", expr: "0 9 * * *" },
      { name: "日志轮转", expr: "0 0 * * 0" }
    ];
    save();
  }
  render();
})();
