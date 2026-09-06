/* nocau · 像素画马赛克 — 色块均值 + 邻近采样放大，零依赖纯本地实现 */
(function () {
  "use strict";

  var cv = document.getElementById("px-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("px-file");
  var sampleBtn = document.getElementById("px-sample");
  var exportBtn = document.getElementById("px-export");
  var sizeEl = document.getElementById("px-size");
  var gridEl = document.getElementById("px-grid");
  var statusEl = document.getElementById("px-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#0f2c52");
    sky.addColorStop(1, "#5fb8f0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffe066";
    ctx.beginPath();
    ctx.arc(600, 90, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f5f4f";
    ctx.fillRect(0, H * 0.66, W, H * 0.34);
    ctx.fillStyle = "#79d8a0";
    for (var i = 0; i < 6; i++) {
      ctx.fillRect(i * 126 + 20, H * 0.66 + 12, 84, H * 0.2);
    }
    ctx.fillStyle = "#28436b";
    ctx.beginPath();
    ctx.moveTo(W * 0.36, H * 0.68);
    ctx.lineTo(W * 0.47, H * 0.38);
    ctx.lineTo(W * 0.62, H * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f6f9ff";
    ctx.beginPath();
    ctx.moveTo(W * 0.5, H * 0.24);
    ctx.lineTo(W * 0.56, H * 0.38);
    ctx.lineTo(W * 0.43, H * 0.38);
    ctx.closePath();
    ctx.fill();
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("示例图已载入，拖块大小看像素化程度");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("图片已载入，点击导出 PNG 可保存像素画");
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
    var block = Math.max(1, parseInt(sizeEl.value, 10) || 14);
    var bw = Math.max(1, Math.ceil(W / block));
    var bh = Math.max(1, Math.ceil(H / block));
    if (gridEl) gridEl.textContent = bw + "×" + bh;
    // 生成低分辨率网格
    var off = document.createElement("canvas");
    off.width = bw;
    off.height = bh;
    var octx = off.getContext("2d");
    var od = octx.createImageData(bw, bh);
    var d = od.data;
    var data = base.data;
    for (var by = 0; by < bh; by++) {
      for (var bx = 0; bx < bw; bx++) {
        var sr = 0, sg = 0, sb = 0, cnt = 0;
        var x0 = bx * block, y0 = by * block;
        var x1 = Math.min(x0 + block, W), y1 = Math.min(y0 + block, H);
        for (var y = y0; y < y1; y++) {
          for (var x = x0; x < x1; x++) {
            var i = (y * W + x) * 4;
            sr += data[i];
            sg += data[i + 1];
            sb += data[i + 2];
            cnt++;
          }
        }
        var oi = (by * bw + bx) * 4;
        if (cnt > 0) {
          d[oi] = sr / cnt;
          d[oi + 1] = sg / cnt;
          d[oi + 2] = sb / cnt;
        } else {
          d[oi] = d[oi + 1] = d[oi + 2] = 0;
        }
        d[oi + 3] = 255;
      }
    }
    octx.putImageData(od, 0, 0);
    // 邻近放大，像素块棱角清晰
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(off, 0, 0, W, H);
  }

  function exportPng() {
    var a = document.createElement("a");
    a.href = cv.toDataURL("image/png");
    a.download = "pixel-art-" + Date.now() + ".png";
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setStatus("已导出像素画 PNG");
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (exportBtn) exportBtn.addEventListener("click", exportPng);
  if (sizeEl) sizeEl.addEventListener("input", applyFilter);

  drawSample();
})();
