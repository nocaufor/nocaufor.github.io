/* nocau Fun 代码页通用脚本：代码块复制按钮 + 整份工程一键复制
   （CSP 兼容，无内联脚本；幂等，不会重复注入按钮） */
(function () {
  "use strict";

  function lang() {
    try { return localStorage.getItem("nocau-lang") === "en" ? "en" : "zh"; } catch (e) { return "zh"; }
  }
  var L = lang();
  var TXT = {
    copy: L === "en" ? "Copy code" : "复制代码",
    copied: L === "en" ? "Copied" : "已复制",
    project: L === "en" ? "Copy full project" : "一键复制整份工程",
    projectDone: L === "en" ? "Full project copied (" : "已复制整份工程（",
    projectDoneTail: L === "en" ? " files)" : " 个文件）",
    fail: L === "en" ? "Copy failed, please select manually" : "复制失败，请手动选择文本"
  };

  function copyText(text, onDone, onFail) {
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      ta.setAttribute("readonly", "readonly");
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { if (onDone) onDone(); } else if (onFail) { onFail(); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { if (onDone) onDone(); }).catch(fallback);
    } else { fallback(); }
  }

  /* 1. 代码块复制按钮（幂等） */
  function initCodeButtons() {
    var blocks = document.querySelectorAll(".code-block");
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      if (block.querySelector(".code-copy-btn")) continue;
      var pre = block.querySelector("pre");
      if (!pre) continue;
      (function (block, pre) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "code-copy-btn";
        btn.textContent = TXT.copy;
        block.appendChild(btn);
        btn.addEventListener("click", function () {
          copyText(pre.innerText, function () {
            btn.textContent = TXT.copied;
            setTimeout(function () { btn.textContent = TXT.copy; }, 1600);
          }, function () { btn.textContent = TXT.fail; });
        });
      })(block, pre);
    }
  }

  /* 2. 整份工程一键复制：收集 .deploy-project 内 pre[data-file] */
  function collectProject(root) {
    var pres = root.querySelectorAll("pre[data-file]");
    var parts = [];
    for (var i = 0; i < pres.length; i++) {
      var name = pres[i].getAttribute("data-file");
      var body = pres[i].innerText.replace(/\s+$/, "");
      parts.push("# ===== " + name + " =====\n" + body);
    }
    return { text: parts.join("\n\n"), count: pres.length };
  }

  function initProjectButtons() {
    var btns = document.querySelectorAll("[data-copy-project]");
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        var sel = btn.getAttribute("data-copy-project");
        var root = sel ? document.querySelector(sel) : document;
        if (!root) root = document;
        btn.addEventListener("click", function () {
          var pack = collectProject(root);
          if (!pack.count) return;
          copyText(pack.text + "\n", function () {
            btn.textContent = TXT.projectDone + pack.count + TXT.projectDoneTail;
            setTimeout(function () { btn.textContent = TXT.project; }, 2200);
          }, function () { btn.textContent = TXT.fail; });
        });
      })(btns[i]);
    }
  }

  function init() {
    initCodeButtons();
    initProjectButtons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
