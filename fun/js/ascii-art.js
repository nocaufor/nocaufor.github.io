/* nocau fun P000035: 字符画 ASCII 转换（本地算法，无外部依赖） */
(function () {
  "use strict";
  var cv = document.getElementById("as-canvas");
  var ctx = cv.getContext("2d");
  var stage = document.getElementById("as-stage");
  var out = document.getElementById("as-out");
  var statusEl = document.getElementById("as-status");
  var sampleImg = null;

  /* 暗→亮字符，从密到疏 */
  var RAMP = "@%#*+=-:. ";
  function charFor(lum) {
    var idx = Math.min(RAMP.length - 1, Math.floor((lum / 255) * RAMP.length));
    return RAMP[RAMP.length - 1 - idx];
  }
  function setStatus(m, err) { statusEl.textContent = m; statusEl.style.color = err ? "#e06c75" : "var(--color-muted,#9aa3b2)"; }
  function drawSource(img) {
    stage.style.display = "block";
    var scale = Math.min(560 / img.naturalWidth, 380 / img.naturalHeight, 1);
    var w = Math.max(48, Math.round(img.naturalWidth * scale));
    var h = Math.max(48, Math.round(img.naturalHeight * scale));
    cv.width = w; cv.height = h;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  }
  function toAscii() {
    if (!cv.width) return;
    var mode = document.getElementById("as-mode").value;
    var target = {
      "0": { cellH: 18, cellW: 10, scale: 0.7 },
      "1": { cellH: 13, cellW: 7, scale: 1 },
      "2": { cellH: 9, cellW: 5, scale: 1.5 }
    }[mode];
    var rawCols = Math.max(20, Math.floor((cv.width * target.scale) / target.cellW));
    var limit = Math.max(40, Math.min(200, parseInt(document.getElementById("as-cols").value, 10) || 110));
    var cols = Math.min(rawCols, limit);
    var cellW = cv.width / cols;
    var cellH = cellW * (target.cellH / target.cellW) * (target.scale > 1 ? 0.86 : 1);
    var rows = Math.max(1, Math.floor(cv.height / cellH));
    var imgData = ctx.getImageData(0, 0, cv.width, cv.height).data;
    var lines = [];
    var bri = [];
    for (var ry = 0; ry < rows; ry++) {
      var line = "";
      for (var rx = 0; rx < cols; rx++) {
        var sx = Math.min(cv.width - 1, Math.floor((rx + 0.5) * cellW));
        var sy = Math.min(cv.height - 1, Math.floor((ry + 0.5) * cellH));
        var i = (sy * cv.width + sx) * 4;
        var lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
        line += charFor(lum);
      }
      lines.push(line.replace(/\s+$/, ""));
    }
    bri = null;
    out.textContent = lines.join("\n");
    setStatus("已生成 " + rows + " 行 × " + cols + " 列字符画；可调节密度与宽度后自动重新生成。");
  }
  function makeSample() {
    var w = 600, h = 420;
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var g = off.getContext("2d");
    var grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0c1630"); grad.addColorStop(0.5, "#3b2f63"); grad.addColorStop(1, "#e8b16e");
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f6f2e6"; g.font = "bold 92px Georgia,serif";
    g.fillText("NOCAU", 70, 210);
    g.font = "italic 42px Georgia,serif"; g.fillStyle = "#ffe7c4";
    g.fillText("ascii · 2026", 90, 290);
    var y = 40; var stars = 150;
    for (var s = 0; s < stars; s++) {
      g.fillStyle = "rgba(255,255,255," + (0.25 + Math.random() * 0.7).toFixed(2) + ")";
      g.beginPath(); g.arc(20 + Math.random() * (w - 40), 18 + Math.random() * 60, 0.6 + Math.random() * 1.6, 0, Math.PI * 2); g.fill();
    }
    var img = new Image();
    img.onload = function () {
      drawSource(img);
      toAscii();
    };
    img.src = off.toDataURL("image/png");
  }
  function handleFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { drawSource(img); toAscii(); URL.revokeObjectURL(url); };
    img.onerror = function () { setStatus("图片读取失败，请重试。", true); };
    img.src = url;
  }
  document.getElementById("as-file").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); });
  document.getElementById("as-sample").addEventListener("click", makeSample);
  document.getElementById("as-mode").addEventListener("change", toAscii);
  document.getElementById("as-cols").addEventListener("change", toAscii);
  document.getElementById("as-copy").addEventListener("click", function () {
    if (!out.textContent || out.textContent.indexOf("字符画") >= 0) { setStatus("还没有字符画可复制。", true); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(out.textContent).then(function () { setStatus("已复制到剪贴板。"); });
    } else {
      var r = document.createRange(); r.selectNode(out);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try { document.execCommand("copy"); setStatus("已复制（兼容模式）。"); } catch (e) { setStatus("复制失败，请手动全选。", true); }
      sel.removeAllRanges();
    }
  });
  setStatus("上传图片或点击“示例图”开始。");
})();
