/* nocau · Sobel 边缘检测 — 零依赖纯本地像素实现 */
(function () {
  "use strict";

  var cv = document.getElementById("se-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("se-file");
  var sampleBtn = document.getElementById("se-sample");
  var thrEl = document.getElementById("se-thr");
  var modeEl = document.getElementById("se-mode");
  var statusEl = document.getElementById("se-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#243b55");
    g.addColorStop(1, "#141e30");
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f5b942";
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.46, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#39c0ff";
    ctx.fillRect(W * 0.12, H * 0.58, 190, 90);
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.moveTo(W * 0.78, H * 0.72);
    ctx.lineTo(W * 0.62, H * 0.9);
    ctx.lineTo(W * 0.94, H * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#e8f1ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(W * 0.3, H * 0.3, 70, 0.4, 2.4);
    ctx.stroke();
    ctx.strokeStyle = "#b8ff9f";
    ctx.lineWidth = 3;
    for (var i = 0; i < 5; i++) {
      var x0 = 40 + i * 35, y0 = H - 40 - i * 28;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + 260, y0 - 40);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "bold 64px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NOCAU", W * 0.5, H * 0.9 - 14);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("示例图已载入，调节阈值与方向查看效果");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("图片已载入，当前为边缘检测结果");
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
    var threshold = parseInt(thrEl.value, 10) || 46;
    var mode = modeEl.value;
    var data = base.data;
    var out = ctx.createImageData(W, H);
    var od = out.data;
    var gx, gy, i, x, y, ax, ay, idx, nIdx, sIdx, wIdx, eIdx;
    for (y = 0; y < H; y++) {
      for (x = 0; x < W; x++) {
        idx = (y * W + x) * 4;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
          od[idx] = od[idx + 1] = od[idx + 2] = 0;
          od[idx + 3] = 255;
          continue;
        }
        // 3x3 Sobel
        var nw = lumAt(data, x - 1, y - 1), n = lumAt(data, x, y - 1), ne = lumAt(data, x + 1, y - 1);
        var w = lumAt(data, x - 1, y), e = lumAt(data, x + 1, y);
        var sw = lumAt(data, x - 1, y + 1), s = lumAt(data, x, y + 1), se = lumAt(data, x + 1, y + 1);
        gx = (ne + 2 * e + se) - (nw + 2 * w + sw);
        gy = (sw + 2 * s + se) - (nw + 2 * n + ne);
        var mag = Math.sqrt(gx * gx + gy * gy);
        var v;
        if (mode === "dx") v = Math.abs(gx);
        else if (mode === "dy") v = Math.abs(gy);
        else v = mag;
        v = v > threshold ? Math.min(255, v) : 0;
        od[idx] = od[idx + 1] = od[idx + 2] = v;
        od[idx + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  function lumAt(d, px, py) {
    var i = (py * W + px) * 4;
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (thrEl) thrEl.addEventListener("input", applyFilter);
  if (modeEl) modeEl.addEventListener("change", applyFilter);

  drawSample();
})();
