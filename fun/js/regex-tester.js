/* nocau Fun 正则测试器：实时匹配高亮与分组展示（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var patternEl = document.getElementById("r-pattern");
  var textEl = document.getElementById("r-text");
  var outputEl = document.getElementById("r-output");
  var statusEl = document.getElementById("r-status");
  var groupsEl = document.getElementById("r-groups");
  var gEl = document.getElementById("r-g");
  var iEl = document.getElementById("r-i");
  var mEl = document.getElementById("r-m");
  var sEl = document.getElementById("r-s");
  if (!patternEl) return;

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function test() {
    var pat = patternEl.value;
    var text = textEl.value;
    if (!pat) {
      outputEl.textContent = "输入正则表达式后实时高亮匹配结果";
      statusEl.textContent = "";
      groupsEl.textContent = "";
      return;
    }
    var flags = "";
    if (gEl.checked) flags += "g";
    if (iEl.checked) flags += "i";
    if (mEl.checked) flags += "m";
    if (sEl.checked) flags += "s";
    var re;
    try {
      re = new RegExp(pat, flags);
    } catch (e) {
      outputEl.textContent = text;
      statusEl.textContent = "正则错误：" + (e.message || "");
      statusEl.className = "r-status r-err";
      groupsEl.textContent = "";
      return;
    }
    statusEl.textContent = "";
    statusEl.className = "r-status";
    // 高亮全部匹配（无 g 时仅第一个）
    var reGlobal = new RegExp(pat, flags.indexOf("g") === -1 ? flags + "g" : flags);
    var html = "";
    var last = 0;
    var match;
    var count = 0;
    while ((match = reGlobal.exec(text)) !== null) {
      html += esc(text.slice(last, match.index)) + "<mark>" + esc(match[0]) + "</mark>";
      last = match.index + match[0].length;
      count++;
      if (match[0] === "") reGlobal.lastIndex++; // 防死循环
      if (flags.indexOf("g") === -1) break;
    }
    html += esc(text.slice(last));
    outputEl.innerHTML = html || esc(text);
    statusEl.textContent = "匹配 " + count + " 处";
    // 分组信息：用带 g 的匹配展示分组
    var groupLines = [];
    var gi = 0;
    var re2 = new RegExp(pat, flags.indexOf("g") === -1 ? flags + "g" : flags);
    var mm;
    while ((mm = re2.exec(text)) !== null && gi < 20) {
      var parts = [];
      for (var k = 0; k < mm.length; k++) {
        parts.push("$" + k + "=" + (mm[k] !== undefined ? "\"" + mm[k] + "\"" : "undefined"));
      }
      groupLines.push("第 " + (gi + 1) + " 组匹配: " + parts.join("  "));
      gi++;
      if (mm[0] === "") re2.lastIndex++;
      if (flags.indexOf("g") === -1) break;
    }
    groupsEl.textContent = groupLines.join("\n");
  }

  [patternEl, textEl, gEl, iEl, mEl, sEl].forEach(function (el) {
    if (el) el.addEventListener("input", test);
    if (el && el.type === "checkbox") el.addEventListener("change", test);
  });

  test();
})();
