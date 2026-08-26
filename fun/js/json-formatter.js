/* nocau Fun JSON 格式化工具：格式化/压缩/排序/校验（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var inputEl = document.getElementById("j-input");
  var outputEl = document.getElementById("j-output");
  var statusEl = document.getElementById("j-status");
  var fmtBtn = document.getElementById("j-fmt");
  var minBtn = document.getElementById("j-min");
  var sortBtn = document.getElementById("j-sort");
  var sampleEl = document.getElementById("j-sample");
  if (!inputEl) return;

  function getInput() {
    return (inputEl.innerText || inputEl.textContent || "").trim();
  }

  function setOutput(text) {
    outputEl.textContent = text;
  }

  function setStatus(msg, isErr) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "j-status " + (isErr ? "j-err" : "j-ok");
  }

  function sortKeys(o) {
    if (Array.isArray(o)) return o.map(sortKeys);
    if (o && typeof o === "object") {
      var out = {};
      Object.keys(o).sort().forEach(function (k) { out[k] = sortKeys(o[k]); });
      return out;
    }
    return o;
  }

  function process(space, sort) {
    var raw = getInput();
    if (!raw) {
      setStatus("请输入 JSON 数据", true);
      return;
    }
    var obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      var detail = e.message || "语法错误";
      setStatus("解析失败：" + detail, true);
      outputEl.textContent = "";
      return;
    }
    if (sort) obj = sortKeys(obj);
    var out = JSON.stringify(obj, null, space);
    setOutput(out);
    var size = (out.length / 1024).toFixed(1);
    setStatus("✓ 校验通过 · 输出 " + size + " KB", false);
  }

  fmtBtn.addEventListener("click", function () { process(2, false); });
  minBtn.addEventListener("click", function () { process(0, false); });
  sortBtn.addEventListener("click", function () { process(2, true); });

  var SAMPLES = {
    obj: '{"name":"nocau","tags":["web","creative"],"meta":{"stars":49,"dark":true}}',
    arr: '[{"id":1,"name":"烟花"},{"id":2,"name":"扫雷"},{"id":3,"name":"2048"}]',
    nested: '{"project":{"name":"portfolio-site","build":0,"pages":["index","fun","ideas"],"config":{"csp":true,"cdn":"self"}}}'
  };
  if (sampleEl) sampleEl.addEventListener("change", function () {
    var v = sampleEl.value;
    if (!v) return;
    inputEl.innerText = SAMPLES[v];
    inputEl.dataset.ph = "";
    process(2, false);
  });

  // 占位提示
  function phCheck() {
    if (!getInput() && inputEl.dataset.ph && outputEl.textContent === "") {
      inputEl.textContent = inputEl.dataset.ph;
      inputEl.dataset.ph = "";
    }
  }
  inputEl.addEventListener("focus", function () {
    if (inputEl.textContent === inputEl.dataset.ph) inputEl.textContent = "";
  });
})();
