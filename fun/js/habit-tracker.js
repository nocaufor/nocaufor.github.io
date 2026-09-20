/* 习惯打卡与连续天数：页面在线演示逻辑
   数据模型 / 连续天数 / 最长连续 / 热力图，均在浏览器本地计算，localStorage 持久化 */
(function () {
  "use strict";

  var KEY = "nocau-habit-log";
  var DAY = 86400000;

  function $(id) { return document.getElementById(id); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function parse(d) { return new Date(d + "T00:00:00Z").getTime(); }
  function fmt(t) { return new Date(t).toISOString().slice(0, 10); }

  function loadLog() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function saveLog(log) {
    log.sort();
    try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) {}
  }
  function toggleCheck(date) {
    var log = loadLog();
    var i = log.indexOf(date);
    if (i >= 0) log.splice(i, 1); else log.push(date);
    saveLog(log);
    return i < 0;
  }

  function currentStreak(log, ref) {
    var set = {}, i;
    for (i = 0; i < log.length; i++) set[log[i]] = 1;
    var cursor = parse(ref);
    if (!set[fmt(cursor)]) cursor -= DAY;      /* 今天未打卡不打断连击 */
    var streak = 0;
    while (set[fmt(cursor)]) { streak += 1; cursor -= DAY; }
    return streak;
  }

  function bestStreak(log) {
    var days = [], seen = {}, i;
    for (i = 0; i < log.length; i++) if (!seen[log[i]]) { seen[log[i]] = 1; days.push(parse(log[i])); }
    days.sort(function (a, b) { return a - b; });
    var best = 0, run = 0, prev = null;
    for (i = 0; i < days.length; i++) {
      run = (prev !== null && days[i] - prev === DAY) ? run + 1 : 1;
      prev = days[i];
      if (run > best) best = run;
    }
    return best;
  }

  function heatmap(log, weeks) {
    var set = {}, i;
    for (i = 0; i < log.length; i++) set[log[i]] = 1;
    var today = parse(todayStr());
    var dow = (new Date(today).getUTCDay() + 6) % 7;      /* 周一 = 0 */
    var end = today + (6 - dow) * DAY;                    /* 本周周日 */
    var start = end - (weeks * 7 - 1) * DAY;
    var rows = [];
    for (var w = 0; w < weeks; w++) {
      var col = [];
      for (var d = 0; d < 7; d++) {
        var t = start + (w * 7 + d) * DAY;
        var key = fmt(t);
        col.push({ date: key, done: !!set[key], future: t > today, today: t === today });
      }
      rows.push(col);
    }
    return rows;
  }

  function completionRate(log, weeks) {
    var set = {}, cells = heatmap(log, weeks), total = 0, hit = 0;
    for (var i = 0; i < log.length; i++) set[log[i]] = 1;
    for (var w = 0; w < cells.length; w++) {
      for (var d = 0; d < 7; d++) {
        var c = cells[w][d];
        if (c.future) continue;
        total += 1;
        if (c.done) hit += 1;
      }
    }
    return total ? Math.round(hit / total * 100) : 0;
  }

  function render() {
    var log = loadLog();
    var nameEl = $("ht-name");
    var name = nameEl && nameEl.value.trim() ? nameEl.value.trim() : "未命名习惯";
    $("ht-streak").textContent = currentStreak(log, todayStr());
    $("ht-best").textContent = bestStreak(log);
    $("ht-total").textContent = log.length;
    $("ht-rate").textContent = completionRate(log, 28) + "%";

    var heat = $("ht-heat");
    heat.innerHTML = "";
    var grid = heatmap(log, 28);
    for (var w = 0; w < grid.length; w++) {
      for (var d = 0; d < 7; d++) {
        var c = grid[w][d];
        var cell = document.createElement("div");
        cell.className = "heat-cell" + (c.done ? " on" : "") + (c.today ? " today" : "");
        cell.title = c.date + (c.future ? "（未来）" : (c.done ? " 已打卡" : " 未打卡"));
        heat.appendChild(cell);
      }
    }
    $("ht-status").textContent = "「" + name + "」累计打卡 " + log.length + " 天，当前连续 " +
      currentStreak(log, todayStr()) + " 天，近 28 周完成率 " + completionRate(log, 28) + "%。";
  }

  function sampleData() {
    var out = [], t = parse(todayStr());
    /* 近 90 天：约 75% 概率打卡，并保证最近 6 天连续，便于观察连续天数 */
    for (var i = 89; i >= 0; i--) {
      var key = fmt(t - i * DAY);
      if (i <= 5) { out.push(key); continue; }
      if (Math.random() < 0.75) out.push(key);
    }
    return out;
  }

  function init() {
    var dateEl = $("ht-date");
    if (!dateEl || !$("ht-heat")) return;
    dateEl.value = todayStr();

    $("ht-check").addEventListener("click", function () {
      var on = toggleCheck(dateEl.value || todayStr());
      $("ht-status").textContent = on ? "已记录打卡。" : "已撤销该日打卡。";
      render();
    });
    $("ht-sample").addEventListener("click", function () {
      saveLog(sampleData());
      $("ht-status").textContent = "已载入 90 天示例数据（其中最近 6 天连续），所有统计与热力图已刷新。";
      render();
    });
    $("ht-clear").addEventListener("click", function () {
      saveLog([]);
      $("ht-status").textContent = "本地记录已清空。";
      render();
    });
    $("ht-name").addEventListener("input", render);
    render();
    if (!loadLog().length) $("ht-status").textContent += " 提示：可先点击“载入 90 天示例数据”查看完整效果。";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
