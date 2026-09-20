/* 阅读时长估算与可读性提示：页面在线演示逻辑
   中文按汉字、英文按单词分别计时，句长分布与长句定位均在浏览器本地计算 */
(function () {
  "use strict";

  var SAMPLE = "把长文交给算法之前，先想清楚一个问题：阅读时长估算到底估的是什么。它估的不是你的理解速度，而是眼球在文本上停留的物理时间。所以在中文里按字、在英文里按词，分别用不同的速率去折算，比用一个统一系数靠谱得多。\n\n文本的可读性同样如此。句子越长、从句越多，读者需要回看的次数就越多，理解成本随之上升。行业里通常把超过四十个汉字的长句视为需要拆分的信号，而中文技术文档的平均句长控制在二十到三十个汉字之间时，多数读者的阅读体验最好。\n\n本文用三组数据说明这件事：字词统计、句长分布、以及按速率折算出的时长。";

  function $(id) { return document.getElementById(id); }

  function analyze(text) {
    var han = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    var words = text.match(/[A-Za-z][A-Za-z'\-]*/g) || [];
    var digits = text.match(/\d+(?:\.\d+)?/g) || [];
    var paragraphs = text.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
    var raw = text.replace(/\r/g, "").split(/[。！？!?；;]+|\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    var sents = raw.map(function (s) {
      var h = (s.match(/[\u4e00-\u9fff]/g) || []).length;
      var w = (s.match(/[A-Za-z][A-Za-z'\-]*/g) || []).length;
      return { text: s, han: h, words: w, weight: h + w * 1.5 };
    });
    var longSents = sents.filter(function (s) { return s.han > 40 || s.words > 25; });
    var avg = sents.length ? Math.round(sents.reduce(function (a, s) { return a + s.weight; }, 0) / sents.length) : 0;
    var maxS = sents.slice().sort(function (a, b) { return b.weight - a.weight; })[0] || null;
    return { han: han, words: words.length, digits: digits.length, paragraphs: paragraphs,
             sents: sents, nSent: sents.length, longSents: longSents, avg: avg, maxS: maxS };
  }

  function duration(a, cpm, wpm) {
    return a.han / cpm * 60 + a.words / wpm * 60;   /* 秒；中英分别按各自速率累加 */
  }

  function fmtDur(sec) {
    if (!isFinite(sec) || sec <= 0) return "0 秒";
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if (m && s) return m + " 分 " + s + " 秒";
    if (m) return m + " 分钟";
    return s + " 秒";
  }

  function run() {
    var text = $("re-text").value || "";
    if (!text.trim()) { $("re-status").textContent = "文本为空：请粘贴内容，或点击“载入示例文本”。"; $("re-k-min").textContent = "—"; $("re-out").innerHTML = ""; return; }
    var cpm = parseInt($("re-mode").value, 10), wpm = parseInt($("re-en").value, 10);
    var a = analyze(text), sec = duration(a, cpm, wpm);
    $("re-k-min").textContent = fmtDur(sec);
    $("re-k-words").textContent = a.han;
    $("re-k-sent").textContent = a.nSent;
    $("re-k-long").textContent = a.longSents.length;
    var zhSec = a.han / cpm * 60, enSec = a.words / wpm * 60;
    $("re-out").innerHTML =
      "<div><b>总量：</b>汉字 " + a.han + " 个 · 英文单词 " + a.words + " 个 · 数字串 " + a.digits + " 处 · 段落 " + a.paragraphs + " 段 · 句子 " + a.nSent + " 句</div>" +
      "<div style=\"margin-top:6px\"><b>耗时拆解：</b>中文 " + fmtDur(zhSec) + "（" + cpm + " 字/分） + 英文 " + fmtDur(enSec) + "（" + wpm + " 词/分） = <b>" + fmtDur(sec) + "</b></div>" +
      "<div style=\"margin-top:6px\"><b>句长：</b>平均 " + a.avg + " 字/句（含英文折算），最长一句约 " + (a.maxS ? Math.round(a.maxS.weight) : 0) + " 字</div>" +
      (a.longSents.length ? "<div style=\"margin-top:6px\">长句 " + a.longSents.length + " 句，建议拆分：超过 40 个汉字或 25 个英文单词的句子会让回看次数明显上升。</div>"
                          : "<div style=\"margin-top:6px\">未发现超长句：所有句子均在 40 个汉字 / 25 个英文单词以内。</div>");
    var top = a.sents.slice().sort(function (x, y) { return y.weight - x.weight; }).slice(0, 5);
    $("re-tblwrap").style.display = "";
    $("re-tblwrap").innerHTML = '<div class="code-card"><p>最长的 5 句（按折算字数排序，超过阈值即标记为长句）：</p>' +
      '<table class="demo-table" id="re-tbl"><thead><tr><th>句子</th><th>汉字</th><th>英文词</th><th>判定</th></tr></thead><tbody>' +
      top.map(function (s) {
        var isLong = s.han > 40 || s.words > 25;
        return "<tr><td>" + s.text.slice(0, 46) + (s.text.length > 46 ? "…" : "") + "</td><td>" + s.han + "</td><td>" + s.words +
          "</td><td>" + (isLong ? '<span class="demo-chip warn">长句</span>' : '<span class="demo-chip ok">正常</span>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    $("re-status").textContent = "已按 " + cpm + " 字/分 + " + wpm + " 词/分 估算：全文约 " + fmtDur(sec) + "，长句 " + a.longSents.length + " 句。";
  }

  function init() {
    if (!$("re-run")) return;
    $("re-sample").addEventListener("click", function () {
      $("re-text").value = SAMPLE; run();
      $("re-status").textContent = "已载入示例文本并完成估算，可直接修改文本或切换阅读方式再点“估算阅读时长”。";
    });
    $("re-clear").addEventListener("click", function () {
      $("re-text").value = ""; $("re-k-min").textContent = "—"; $("re-k-words").textContent = "0";
      $("re-k-sent").textContent = "0"; $("re-k-long").textContent = "0";
      $("re-out").innerHTML = ""; $("re-tblwrap").style.display = "none";
      $("re-status").textContent = "已清空：等待重新粘贴文本。";
    });
    $("re-run").addEventListener("click", run);
    $("re-mode").addEventListener("change", run);
    $("re-en").addEventListener("change", run);
    $("re-sample").click();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
