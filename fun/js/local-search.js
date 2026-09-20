/* 本地倒排索引检索：页面在线演示逻辑
   分词（英文按单词、中文按 2-gram）→ 倒排表 → TF-IDF 打分 → 片段高亮 */
(function () {
  "use strict";

  var SAMPLE = [
    "备份轮转方案 :: 用 SQLite 记录每次备份的元数据，按保留策略决定归档与删除，支持 dry-run 演练，避免误删线上快照。",
    "日志告警阈值 :: 按分钟聚合错误数，超过阈值触发告警，注意区分显式 ERROR 与 HTTP 状态码，避免把 /api/errors 误判为错误。",
    "单位换算因子表 :: 线性类别用因子相除，温度用仿射公式，二者统一为 to_base 与 from_base，新增单位只改数据表。",
    "阅读时长估算 :: 中文按字、英文按词分别折算，句长超过阈值提示拆分，估算的是眼球停留时间而非理解速度。",
    "倒排索引与缓存 :: 倒排表把词项映射到文档，检索时按 TF-IDF 累加打分；热点查询可以加一层 LRU 缓存，注意失效策略。",
    "CSS 主题令牌 :: 用 CSS 变量统一管理颜色，浅色与深色主题只切换令牌值，避免在组件里写死深色 fallback。"
  ].join("\n");

  function $(id) { return document.getElementById(id); }

  /* 中文按 2-gram 切分（不足 2 字时保留单字），英文/数字按 \w+ 取词 */
  function tokenize(text) {
    var out = [], lower = text.toLowerCase();
    (lower.match(/[a-z0-9_]+/g) || []).forEach(function (w) { out.push(w); });
    var han = lower.match(/[\u4e00-\u9fff]+/g) || [];
    han.forEach(function (seq) {
      if (seq.length === 1) { out.push(seq); return; }
      for (var i = 0; i < seq.length - 1; i++) out.push(seq.slice(i, i + 2));
    });
    return out;
  }

  function parseCorpus(text) {
    return text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l, i) {
      var p = l.split("::");
      var title = (p[0] || "").trim(), body = (p.slice(1).join("::") || "").trim();
      if (!body) { body = title; title = "文档 " + (i + 1); }
      return { id: i, title: title, body: body, text: title + " " + body };
    });
  }

  var INDEX = { docs: [], postings: {}, df: {}, avgLen: 0 };

  function build(docs) {
    var postings = {}, df = {}, len = 0;
    docs.forEach(function (d) {
      var toks = tokenize(d.text), tf = {};
      toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      len += toks.length;
      Object.keys(tf).forEach(function (t) {
        (postings[t] = postings[t] || []).push({ doc: d.id, tf: tf[t] });
        df[t] = (df[t] || 0) + 1;
      });
    });
    INDEX = { docs: docs, postings: postings, df: df, avgLen: docs.length ? len / docs.length : 0 };
    return INDEX;
  }

  /* 简化 TF-IDF：tf 归一化 × log(1 + N/df)，再按长度做轻度归一 */
  function search(q, topK) {
    var terms = tokenize(q), scores = {}, matched = {};
    terms.forEach(function (t) {
      var list = INDEX.postings[t];
      if (!list) return;
      var idf = Math.log(1 + INDEX.docs.length / (INDEX.df[t] || 1));
      list.forEach(function (p) {
        scores[p.doc] = (scores[p.doc] || 0) + (p.tf / (p.tf + 1.2)) * idf;
        matched[p.doc] = (matched[p.doc] || {})[t] = true;
      });
    });
    return Object.keys(scores).map(function (id) {
      var d = INDEX.docs[+id], toks = tokenize(d.text).length;
      var norm = 1 / Math.sqrt(1 + toks / (INDEX.avgLen || 1));
      return { doc: d, score: scores[id] * norm, matched: Object.keys(matched[id] || {}) };
    }).sort(function (a, b) { return b.score - a.score; }).slice(0, topK);
  }

  function highlight(text, terms, span) {
    var s = text, i;
    for (i = 0; i < terms.length; i++) {
      if (/^[a-z0-9_]+$/.test(terms[i])) {
        s = s.replace(new RegExp("(" + terms[i] + ")", "gi"), "<mark>$1</mark>");
      } else if (terms[i].length >= 2) {
        var seg = terms[i];
        var pos = s.toLowerCase().indexOf(seg);
        while (pos >= 0 && s.indexOf("<mark>", Math.max(0, pos - 6)) < 0) {
          s = s.slice(0, pos) + "<mark>" + s.slice(pos, pos + 2) + "</mark>" + s.slice(pos + 2);
          pos = s.toLowerCase().indexOf(seg, pos + 15);
        }
      }
    }
    s = s.slice(0, span);
    return s;
  }

  function runBuild(silent) {
    var docs = parseCorpus($("ls-corpus").value || "");
    if (!docs.length) { $("ls-status").textContent = "文档集为空：每行格式为“标题 :: 正文”。"; return false; }
    build(docs);
    $("ls-k-docs").textContent = docs.length;
    $("ls-k-terms").textContent = Object.keys(INDEX.postings).length;
    var sample = Object.keys(INDEX.postings).slice(0, 12);
    $("ls-out").innerHTML = "<div><b>倒排表已构建：</b>" + docs.length + " 篇文档 / " + Object.keys(INDEX.postings).length + " 个词项，" +
      "平均文档长度 " + INDEX.avgLen.toFixed(1) + " 个词项。</div>" +
      "<div style=\"margin-top:6px\"><b>词项片段：</b>" + sample.map(function (t) {
        return "<code>" + t + "</code>→" + INDEX.postings[t].length + " 篇";
      }).join(" · ") + "</div>" +
      "<div style=\"margin-top:6px\">中文按二字切分（如“备份轮转” → 备份 / 份轮 / 轮转），英文按单词切分；这与工程区 <code>mini_search.py</code> 的 <code>tokenize()</code> 完全一致。</div>";
    if (!silent) $("ls-status").textContent = "已为 " + docs.length + " 篇文档建索引，可输入查询词搜索。";
    return true;
  }

  function runSearch() {
    if (!INDEX.docs.length) { if (!runBuild(true)) return; }
    var q = ($("ls-q").value || "").trim();
    if (!q) { $("ls-status").textContent = "查询词为空：可试“备份”“缓存”“index”等。"; return; }
    var topK = parseInt($("ls-top").value, 10) || 5;
    var t0 = performance.now(), hits = search(q, topK), ms = performance.now() - t0;
    $("ls-k-hits").textContent = hits.length;
    $("ls-k-ms").textContent = ms.toFixed(2) + " ms";
    var terms = tokenize(q);
    $("ls-tblwrap").style.display = "";
    $("ls-tblwrap").innerHTML = '<div class="code-card"><p>查询 <code>' + q + "</code> 命中 " + hits.length + " 篇（按 TF-IDF 排序）：</p>" +
      (hits.length
        ? '<table class="demo-table" id="ls-tbl"><thead><tr><th>排名</th><th>文档</th><th>得分</th><th>命中片段</th></tr></thead><tbody>' +
          hits.map(function (h, i) {
            return "<tr><td>" + (i + 1) + "</td><td>" + h.doc.title + "</td><td>" + h.score.toFixed(3) +
              "</td><td>" + highlight(h.doc.body, terms, 90) + "</td></tr>";
          }).join("") + "</tbody></table>"
        : '<p class="demo-status">没有命中：试试更短的词，或检查索引是否覆盖该词项。</p>') + "</div>";
    $("ls-status").textContent = "查询“" + q + "”命中 " + hits.length + " 篇，耗时 " + ms.toFixed(2) + " ms（词项 " + terms.length + " 个）。";
  }

  function init() {
    if (!$("ls-build")) return;
    $("ls-sample").addEventListener("click", function () {
      $("ls-corpus").value = SAMPLE; $("ls-q").value = "备份";
      runBuild(true); runSearch();
      $("ls-status").textContent = "已载入 6 篇示例语料并以“备份”完成一次检索，可改查询词或换自己的语料。";
    });
    $("ls-build").addEventListener("click", function () {
      if (runBuild()) { INDEX.docs.length ? runSearch() : null; }
    });
    $("ls-search").addEventListener("click", runSearch);
    $("ls-clear").addEventListener("click", function () {
      $("ls-corpus").value = ""; $("ls-q").value = ""; $("ls-out").innerHTML = ""; $("ls-tblwrap").style.display = "none";
      $("ls-k-docs").textContent = "0"; $("ls-k-terms").textContent = "0"; $("ls-k-hits").textContent = "0"; $("ls-k-ms").textContent = "0 ms";
      INDEX = { docs: [], postings: {}, df: {}, avgLen: 0 };
      $("ls-status").textContent = "已清空：语料与索引均已重置。";
    });
    $("ls-q").addEventListener("keydown", function (e) { if (e.key === "Enter") runSearch(); });
    $("ls-sample").click();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
