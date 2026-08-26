/* nocau Fun Markdown 编辑器：轻量实时预览（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var input = document.getElementById("md-input");
  var output = document.getElementById("md-output");
  var sampleBtn = document.getElementById("md-sample");
  var clearBtn = document.getElementById("md-clear");
  var copyBtn = document.getElementById("md-copy");
  if (!input || !output) return;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inline(src) {
    var s = esc(src);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
    return s;
  }

  function renderLine(line) {
    var h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      var lv = h[1].length;
      return "<h" + lv + ">" + inline(h[2]) + "</h" + lv + ">";
    }
    if (/^>\s?/.test(line)) return "<blockquote>" + inline(line.replace(/^>\s?/, "")) + "</blockquote>";
    if (/^[-*]\s+/.test(line)) return "<li>" + inline(line.replace(/^[-*]\s+/, "")) + "</li>";
    if (/^\d+\.\s+/.test(line)) return "<li>" + inline(line.replace(/^\d+\.\s+/, "")) + "</li>";
    if (/^---+$/.test(line)) return "<hr />";
    return "<p>" + inline(line) + "</p>";
  }

  function render(md) {
    var lines = md.split("\n");
    var html = "";
    var inCode = false;
    var inUl = false;
    var inOl = false;
    var inTable = false;
    var tableRows = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^```/.test(line)) {
        if (inCode) {
          html += "</code></pre>";
          inCode = false;
        } else {
          closeLists();
          html += "<pre><code>";
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        html += esc(line) + "\n";
        continue;
      }
      // 表格检测：| a | b |
      if (/^\s*\|/.test(line)) {
        tableRows.push(line);
        inTable = true;
        continue;
      } else if (inTable) {
        html += renderTable(tableRows);
        tableRows = [];
        inTable = false;
      }
      if (/^[-*]\s+/.test(line)) {
        if (!inUl) { closeOl(); html += "<ul>"; inUl = true; }
        html += renderLine(line);
        continue;
      } else if (inUl) { html += "</ul>"; inUl = false; }
      if (/^\d+\.\s+/.test(line)) {
        if (!inOl) { closeUl(); html += "<ol>"; inOl = true; }
        html += renderLine(line);
        continue;
      } else if (inOl) { html += "</ol>"; inOl = false; }
      if (/^\s*$/.test(line)) { continue; }
      html += renderLine(line);
    }
    if (inCode) html += "</code></pre>";
    if (inUl) html += "</ul>";
    if (inOl) html += "</ol>";
    if (inTable) html += renderTable(tableRows);
    output.innerHTML = html;

    function closeLists() { if (inUl) { html += "</ul>"; inUl = false; } if (inOl) { html += "</ol>"; inOl = false; } }
    function closeUl() { if (inUl) { html += "</ul>"; inUl = false; } }
    function closeOl() { if (inOl) { html += "</ol>"; inOl = false; } }
  }

  function renderTable(rows) {
    var h = "";
    var body = "";
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].trim().replace(/^\||\|$/g, "").split("|").map(function (s) { return s.trim(); });
      if (i === 1 && /^:?-{2,}:?$/.test(cells[0])) continue; // 分隔行
      if (i === 0) {
        h = "<tr>" + cells.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr>";
      } else {
        body += "<tr>" + cells.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>";
      }
    }
    return "<table><thead>" + h + "</thead><tbody>" + body + "</tbody></table>";
  }

  function update() {
    render(input.value);
  }

  var SAMPLE = [
    "# Markdown 示例",
    "",
    "支持**加粗**、*斜体*、`行内代码` 与 [链接](https://nocau.com)。",
    "",
    "## 列表",
    "- 第一项",
    "- 第二项",
    "  1. 嵌套有序",
    "",
    "## 代码块",
    "```js",
    "function hello() {",
    "  return 'nocau';",
    "}",
    "```",
    "",
    "## 引用",
    "> 少即是多，保持专注。",
    "",
    "## 表格",
    "| 项目 | 状态 |",
    "| --- | --- |",
    "| 写作 | 进行中 |",
    "| 发布 | 待办 |",
    "",
    "~~划掉的内容~~ 不显示。"
  ].join("\n");

  input.addEventListener("input", update);
  if (sampleBtn) sampleBtn.addEventListener("click", function () { input.value = SAMPLE; update(); });
  if (clearBtn) clearBtn.addEventListener("click", function () { input.value = ""; update(); });
  if (copyBtn) copyBtn.addEventListener("click", function () {
    var text = output.innerHTML;
    function done() {
      if (copyBtn) {
        var old = copyBtn.textContent;
        copyBtn.textContent = "已复制";
        setTimeout(function () { copyBtn.textContent = old; }, 1200);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  input.value = SAMPLE;
  update();
})();
