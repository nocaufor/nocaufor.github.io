/* 数据库备份与归档轮转：备份轮转模拟器（与页面 Python 轮转算法一致）
   纯浏览器端计算，不上传任何数据；用于在页面上把轮转策略跑一遍看清楚结果 */
(function () {
  "use strict";
  var HOUR = 3600000, DAY = 86400000;
  var st = { base: 0, files: [] };

  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function stamp(ts) {
    var d = new Date(ts);
    return "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "_" +
      pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function human(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function sizeText(n) { return (n / 1048576).toFixed(1) + " MB"; }
  function dayStart(ts) { var d = new Date(ts); d.setHours(2, 30, 0, 0); return d.getTime(); }

  /* 生成一条备份记录（大小按 18~64MB 的稳定伪随机，便于对照观察） */
  function makeFile(ts) {
    var seed = Math.floor(ts / DAY) % 977;
    var mb = 18 + (seed % 47);
    return { ts: ts, name: "app_" + stamp(ts) + ".sql.gz", size: mb * 1048576 };
  }

  function seedFiles(days) {
    var out = [], i;
    for (i = days - 1; i >= 0; i--) out.push(makeFile(st.base - i * DAY));
    return out;
  }

  /* 轮转：保留最新 keepDaily 份；更早的「每月 1 号」归档、其余删除；归档目录只留最新 keepMonthly 份 */
  function rotate(files, keepDaily, keepMonthly) {
    var sorted = files.slice().sort(function (a, b) { return a.ts - b.ts; });
    var older = sorted.slice(0, Math.max(0, sorted.length - keepDaily));
    var kept = sorted.slice(Math.max(0, sorted.length - keepDaily));
    var archived = [], deleted = [];
    older.forEach(function (f) {
      var d = new Date(f.ts);
      if (d.getDate() === 1) archived.push(f); else deleted.push(f);
    });
    var archSorted = archived.slice().sort(function (a, b) { return a.ts - b.ts; });
    var archDrop = archSorted.slice(0, Math.max(0, archSorted.length - keepMonthly));
    var archKeep = archSorted.slice(Math.max(0, archSorted.length - keepMonthly));
    archDrop.forEach(function (f) { f.act = "delete"; });
    archKeep.forEach(function (f) { f.act = "archive"; });
    kept.forEach(function (f) { f.act = "keep"; });
    deleted.forEach(function (f) { f.act = "delete"; });
    return { total: sorted.length, kept: kept.length, archived: archKeep.length, deleted: sorted.length - kept.length - archKeep.length };
  }

  function render(stats, dry) {
    $("db-k-total").textContent = stats.total;
    $("db-k-keep").textContent = stats.kept;
    $("db-k-arch").textContent = stats.archived;
    $("db-k-del").textContent = stats.deleted;

    var sorted = st.files.slice().sort(function (a, b) { return b.ts - a.ts; });
    var tb = $("db-table").querySelector("tbody");
    var rows = sorted.slice(0, 24).map(function (f) {
      var label = f.act === "keep" ? "保留" : f.act === "archive" ? "归档到 monthly" : (dry ? "待删除" : "删除");
      var chip = f.act === "keep" ? "ok" : f.act === "archive" ? "" : "warn";
      return "<tr><td class=\"demo-mono\">" + f.name + "</td><td>" + human(f.ts) + "</td><td class=\"num\">" +
        sizeText(f.size) + "</td><td><span class=\"demo-chip " + chip + "\">" + label + "</span></td></tr>";
    });
    if (sorted.length > 24) {
      rows.push("<tr><td colspan=\"4\">… 另有 " + (sorted.length - 24) + " 条较早记录未展开（完整逻辑见下方工程代码）</td></tr>");
    }
    tb.innerHTML = rows.join("");
  }

  function run(dry) {
    var keepDaily = Math.max(1, Math.min(60, parseInt($("db-keep-daily").value, 10) || 7));
    var keepMonthly = Math.max(1, Math.min(36, parseInt($("db-keep-monthly").value, 10) || 12));
    var stats = rotate(st.files, keepDaily, keepMonthly);
    render(stats, dry);
    $("db-status").textContent = "扫描 " + stats.total + " 份备份：保留最新 " + stats.kept +
      " 份、归档 " + stats.archived + " 份、" + (dry ? "待删除 " : "删除 ") + stats.deleted +
      " 份（截止 " + human(st.base) + "）。" +
      (dry ? "当前为演练模式：只列出动作，未真正删除任何文件。" : "已按策略标记清理过期文件。");
    return stats;
  }

  function init() {
    if (!$("db-table")) return;
    st.base = dayStart(Date.now());

    $("db-run").addEventListener("click", function () {
      var days = Math.max(30, Math.min(400, parseInt($("db-days").value, 10) || 90));
      st.base = dayStart(Date.now());
      st.files = seedFiles(days);
      run($("db-dry").checked);
      $("db-status").textContent = "已按 " + days + " 天生成 " + st.files.length + " 份模拟备份（每天 02:30 一份）。" + $("db-status").textContent;
    });

    $("db-advance").addEventListener("click", function () {
      if (!st.files.length) { $("db-status").textContent = "请先点击“生成备份集并执行轮转”初始化备份集。"; return; }
      st.base += DAY;
      st.files.push(makeFile(st.base));
      run($("db-dry").checked);
      $("db-status").textContent = "已推进 1 天并新增 1 份备份。" + $("db-status").textContent;
    });

    $("db-reset").addEventListener("click", function () {
      st.files = []; st.base = dayStart(Date.now());
      $("db-k-total").textContent = $("db-k-keep").textContent = $("db-k-arch").textContent = $("db-k-del").textContent = "0";
      $("db-table").querySelector("tbody").innerHTML = "";
      $("db-status").textContent = "已重置。点击“生成备份集并执行轮转”可重新演练。";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
