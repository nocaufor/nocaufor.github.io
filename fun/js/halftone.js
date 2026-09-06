/* nocau · 半调网点 — 亮度映射圆点大小，零依赖纯本地实现 */
(function () {
  "use strict";

  var cv = document.getElementById("ht-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("ht-file");
  var sampleBtn = document.getElementById("ht-sample");
  var sizeEl = document.getElementById("ht-size");
  var styleEl = document.getElementById("ht-style");
  var statusEl = document.getElementById("ht-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    ctx.fillStyle = "#10131c";
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#3ec6ff");
    g.addColorStop(0.5, "#f2f4ff");
    g.addColorStop(1, "#ff5d8f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(16,19,28,0.9)";
    ctx.beginPath();
    ctx.arc(W * 0.3, H * 0.42, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 78px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HALF", 40, 100);
    ctx.textAlign = "right";
    ctx.fillText("TONE", W - 40, 200);
    for (var i = 0; i < 12; i++) {
      var yy = 300 + i * 16;
      ctx.fillStyle = "rgba(10,8,20," + (0.1 + 0.08 * i) + ")";
      ctx.fillRect(0, yy, W, 6);
    }
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("示例图已载入，网点随明暗疏密变化");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("图片已载入，当前为半调效果");
  }

  function loadFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      drawUploaded(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      setStatus("图片读取失败，请换一张试试");
    };
    img.src = url;
  }

  function applyFilter() {
    if (!base) return;
    var cell = Math.max(2, parseInt(sizeEl.value, 10) || 8);
    var style = styleEl.value;
    var data = base.data;
    var Wc = W, Hc = H;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, Wc, Hc);
    ctx.fillStyle = "#0c0f17";
    var y, x, sum, cnt, lum;
    for (y = 0; y < Hc; y += cell) {
      for (x = 0; x < Wc; x += cell) {
        sum = 0;
        cnt = 0;
        var maxY = Math.min(y + cell, Hc);
        var maxX = Math.min(x + cell, Wc);
        for (var yy = y; yy < maxY; yy++) {
          for (var xx = x; xx < maxX; xx++) {
            var i = (yy * Wc + xx) * 4;
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            cnt++;
          }
        }
        lum = sum / (cnt || 1) / 255;
        var cx = x + cell / 2, cy = y + cell / 2;
        var dark = 1 - lum;
        var r = cell * 0.52 * Math.sqrt(Math.min(1, dark * 1.18));
        if (r < 0.35) continue;
        ctx.beginPath();
        if (style === "square") {
          var side = r * Math.SQRT2 * 0.86;
          ctx.fillRect(cx - side / 2, cy - side / 2, side, side);
        } else {
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (sizeEl) sizeEl.addEventListener("input", applyFilter);
  if (styleEl) styleEl.addEventListener("change", applyFilter);

  drawSample();
})();
