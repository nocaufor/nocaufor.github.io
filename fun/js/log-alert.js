/* 日志 tail 与指标提取：页面在线演示逻辑
   解析访问日志 / 应用日志 → 级别归类 → 按时间窗口聚合 → 阈值告警，全部在浏览器本地计算 */
(function () {
  "use strict";

  var ACCESS = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\w+) ([^"]*?) [^"]*" (\d{3}) (\d+|-)/;

  var SAMPLE = [
    '203.0.113.7 - - [18/Sep/2026:13:55:02 +0800] "GET /api/orders HTTP/1.1" 200 5123',
    '203.0.113.7 - - [18/Sep/2026:13:55:18 +0800] "POST /api/pay HTTP/1.1" 500 218',
    '198.51.100.24 - - [18/Sep/2026:13:55:41 +0800] "GET /api/orders HTTP/1.1" 502 189',
    '198.51.100.24 - - [18/Sep/2026:13:56:03 +0800] "GET /api/pay HTTP/1.1" 500 203',
    '203.0.113.7 - - [18/Sep/2026:13:56:12 +0800] "GET /static/app.js HTTP/1.1" 200 42110',
    '198.51.100.24 - - [18/Sep/2026:13:56:44 +0800] "GET /api/pay HTTP/1.1" 500 199',
    '203.0.113.9 - - [18/Sep/2026:13:56:51 +0800] "GET /api/pay HTTP/1.1" 503 176',
    '203.0.113.9 - - [18/Sep/2026:13:57:02 +0800] "GET /api/orders HTTP/1.1" 429 87',
    '18/Sep/2026 13:57:31 [ERROR] db pool exhausted, retry in 2s',
    '18/Sep/2026 13:57:33 [WARN] slow query 4821ms: select * from orders',
    '18/Sep/2026 13:57:35 [ERROR] db pool exhausted, retry in 2s',
    '18/Sep/2026 13:57:52 [INFO] retry succeeded for /api/orders',
    '18/Sep/2026 13:58:05 [ERROR] upstream timeout after 3000ms',
    '18/Sep/2026 13:58:21 [ERROR] upstream timeout after 3000ms'
  ].join("\n");

  function $(id) { return document.getElementById(id); }

  function levelOf(status, line) {
    if (/\bERROR\b|\bFATAL\b|Exception|Traceback/.test(line)) return "ERROR";
    if (/\bWARN(ING)?\b/.test(line)) return "WARN";
    if (status != null) return status >= 500 ? "ERROR" : (status >= 400 ? "WARN" : "INFO");
    return "INFO";
  }

  function normTime(ts) {
    /* 先剥掉日期前缀，否则 "18/Sep/2026:13:55:02" 会被正则读成 "26:13" */
    return String(ts).replace(/\d{1,2}\/\w{3}\/\d{4}:?/, " ");
  }

  function minuteOf(ts) {
    /* [18/Sep/2026:13:55:02 +0800] → 13:55；18/Sep/2026 13:57:31 → 13:57 */
    var m = normTime(ts).match(/(\d{2}:\d{2})/);
    return m ? m[1] : "未知";
  }

  function stampSec(ts) {
    /* 只用于窗口聚合精度：把 HH:MM:SS 折算为当日秒数 */
    var m = normTime(ts).match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    return (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0));
  }

  function parse(text, winSec) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var rows = [], bad = 0;
    lines.forEach(function (line) {
      var m = line.match(ACCESS), rec;
      if (m) {
        rec = { ip: m[1], ts: m[2], method: m[3], path: m[4].split("?")[0], status: +m[5], bytes: m[6] };
      } else {
        var t = line.match(/^(\d{2}\/\w{3}\/\d{4})\s+([\d:]+)/);
        if (!t) { bad++; return; }
        rec = { ip: "-", ts: t[2], method: "-", path: "-", status: null, bytes: "-" };
      }
      rec.level = levelOf(rec.status, line);
      rec.line = line;
      rec.minute = minuteOf(rec.ts);
      rec.sec = stampSec(rec.ts);
      rec.slot = rec.sec == null ? "未知" : String(Math.floor(rec.sec / winSec) * winSec);
      rows.push(rec);
    });
    return { rows: rows, bad: bad };
  }

  function bucketize(rows, winSec) {
    var map = {};
    rows.forEach(function (r) {
      var k = r.slot;
      if (!map[k]) map[k] = { slot: k, total: 0, err: 0, warn: 0, minutes: {} };
      map[k].total++;
      if (r.level === "ERROR") map[k].err++;
      if (r.level === "WARN") map[k].warn++;
      map[k].minutes[r.minute] = 1;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return (+a.slot || 0) - (+b.slot || 0); });
  }

  function fmtSlot(slot) {
    var s = +slot;
    if (!isFinite(s)) return "未知时间段";
    var mm = String(Math.floor(s / 60) % 60), ss = String(s % 60);
    return mm + ":" + (ss.length < 2 ? "0" + ss : ss);
  }

  function topN(rows, key, n, filter) {
    var map = {};
    rows.forEach(function (r) {
      if (filter && !filter(r)) return;
      var k = r[key];
      map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).map(function (k) { return [k, map[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
  }

  function run() {
    var text = $("la-text").value || "";
    if (!text.trim()) { $("la-status").textContent = "日志为空：请粘贴日志内容，或点击“载入示例日志”。"; return; }
    var thr = Math.max(1, parseInt($("la-thr").value, 10) || 3);
    var winSec = parseInt($("la-win").value, 10) || 60;
    var p = parse(text, winSec), rows = p.rows;
    if (!rows.length) { $("la-status").textContent = "未识别出有效日志行，请检查格式（支持 Nginx/Apache 访问日志与带时间戳的应用日志）。"; return; }
    var slots = bucketize(rows, winSec);
    var alerts = slots.filter(function (s) { return s.err >= thr; });
    var errs = rows.filter(function (r) { return r.level === "ERROR"; }).length;
    var warns = rows.filter(function (r) { return r.level === "WARN"; }).length;

    $("la-k-lines").textContent = rows.length;
    $("la-k-alerts").textContent = alerts.length;
    $("la-k-err").textContent = errs;
    $("la-k-rate").textContent = (rows.length ? (errs / rows.length * 100).toFixed(1) : "0") + "%";

    var ipTop = topN(rows, "ip", 3, function (r) { return r.level === "ERROR"; });
    var pathTop = topN(rows, "path", 3, function (r) { return r.level === "ERROR"; });
    $("la-out").innerHTML =
      "<div><b>级别分布：</b>ERROR " + errs + " · WARN " + warns + " · INFO " + (rows.length - errs - warns) +
      (p.bad ? "（另有 " + p.bad + " 行无法识别，已跳过）" : "") + "</div>" +
      "<div style=\"margin-top:6px\"><b>TOP 错误来源 IP：</b>" + (ipTop.length ? ipTop.map(function (x) { return x[0] + "（" + x[1] + " 次）"; }).join(" · ") : "无") + "</div>" +
      "<div style=\"margin-top:6px\"><b>TOP 错误路径：</b>" + (pathTop.length ? pathTop.map(function (x) { return x[0] + "（" + x[1] + " 次）"; }).join(" · ") : "无") + "</div>" +
      "<div style=\"margin-top:6px\"><b>告警结论：</b>" + (alerts.length
        ? alerts.length + " 个时间窗口错误数达到阈值 " + thr + "：" + alerts.map(function (s) { return fmtSlot(s.slot) + "（" + s.err + " 条）"; }).join("、") + "，建议立即查看上游依赖与线程池水位。"
        : "所有窗口错误数均低于阈值 " + thr + "，无需告警。") + "</div>";

    $("la-tblwrap").style.display = "";
    $("la-tblwrap").innerHTML = '<div class="code-card"><p>按 ' + (winSec === 60 ? "分钟" : "5 分钟") + ' 窗口聚合（阈值 ' + thr + ' 条即标红）：</p>' +
      '<table class="demo-table" id="la-tbl"><thead><tr><th>窗口</th><th>总条数</th><th>ERROR</th><th>WARN</th><th>结论</th></tr></thead><tbody>' +
      slots.map(function (s) {
        return "<tr><td>" + fmtSlot(s.slot) + "</td><td>" + s.total + "</td><td>" + s.err + "</td><td>" + s.warn + "</td><td>" +
          (s.err >= thr ? '<span class="demo-chip warn">告警</span>' : '<span class="demo-chip ok">正常</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    $("la-status").textContent = "已解析 " + rows.length + " 行日志，错误 " + errs + " 条（" +
      (rows.length ? (errs / rows.length * 100).toFixed(1) : 0) + "%），触发告警窗口 " + alerts.length + " 个。";
  }

  function init() {
    if (!$("la-run")) return;
    $("la-sample").addEventListener("click", function () {
      $("la-text").value = SAMPLE; run();
      $("la-status").textContent = "已载入 " + SAMPLE.split("\n").length + " 行示例日志（含 5xx 突增与线程池耗尽）并完成分析，可改阈值后重跑。";
    });
    $("la-clear").addEventListener("click", function () {
      $("la-text").value = ""; $("la-out").innerHTML = ""; $("la-tblwrap").style.display = "none";
      $("la-k-lines").textContent = "0"; $("la-k-alerts").textContent = "0"; $("la-k-err").textContent = "0"; $("la-k-rate").textContent = "0%";
      $("la-status").textContent = "已清空：等待重新粘贴日志。";
    });
    $("la-run").addEventListener("click", run);
    $("la-thr").addEventListener("change", run);
    $("la-win").addEventListener("change", run);
    $("la-sample").click();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
