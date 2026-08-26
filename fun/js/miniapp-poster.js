/* {page}：代码复制按钮 + 页面交互（CSP 兼容，无内联） */
(function () {
  "use strict";
  var lang = "zh";
  try { lang = localStorage.getItem("nocau-lang") === "en" ? "en" : "zh"; } catch (e) {}

  function copyText(text, btn) {
    var ok = function () { btn.textContent = lang === "en" ? "Copied" : "已复制"; setTimeout(function () { btn.textContent = lang === "en" ? "Copy code" : "复制代码"; }, 1600); };
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fallback);
    } else { fallback(); }
  }

  function init() {
    document.querySelectorAll(".code-block").forEach(function (block) {
      if (block.querySelector(".code-copy-btn")) return;
      var pre = block.querySelector("pre");
      if (!pre) return;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-copy-btn";
      btn.textContent = lang === "en" ? "Copy code" : "复制代码";
      block.appendChild(btn);
      btn.addEventListener("click", function () { copyText(pre.innerText, btn); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
