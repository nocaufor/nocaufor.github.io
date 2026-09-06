/* nocau · 铅笔素描 — 反色 + 盒状模糊 + 颜色减淡，零依赖纯本地像素实现 */
(function () {
  "use strict";

  var cv = document.getElementById("ps-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("ps-file");
  var sampleBtn = document.getElementById("ps-sample");
  var strengthEl = document.getElementById("ps-strength");
  var radiusEl = document.getElementById("ps-radius");
  var radiusText = document.getElementById("ps-radius-text");
  var statusEl = document.getElementById("ps-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    ctx.fillStyle = "#e9e4d8";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c67a2b";
    ctx.beginPath();
    ctx.arc(W * 0.52, H * 0.42, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9455f";
    ctx.beginPath();
    ctx.ellipse(W * 0.82, H * 0.5, 96, 150, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3c3c4a";
    ctx.lineWidth = 34;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(20, H - 70);
    ctx.lineTo(W * 0.68, H - 130);
    ctx.lineTo(W - 20, H - 70);
    ctx.stroke();
    ctx.fillStyle = "#3c3c4a";
    ctx.font = "bold 72px serif";
    ctx.textAlign = "center";
    ctx.fillText("sketch", W * 0.32, 96);
    ctx.fillStyle = "#7c6f52";
    ctx.font = "italic 34px serif";
    ctx.fillText("pencil", W * 0.72, H - 52);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("示例图已载入，可拖动强度与模糊半径");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("图片已载入，当前为素描效果");
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

  function grayArray() {
    var d = base.data;
    var arr = new Float32Array(W * H);
    for (var i = 0, j = 0; i < d.length; i += 4, j++) {
      arr[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return arr;
  }

  function blurGray(src, radius) {
    var r = Math.max(1, radius);
    var tmp = new Float32Array(W * H);
    var x, y, k, idx, sum, count;
    // 横向盒状模糊
    for (y = 0; y < H; y++) {
      var row = y * W;
      sum = 0;
      count = 0;
      for (k = -r; k <= r; k++) {
        var sx = k < 0 ? 0 : (k >= W ? W - 1 : k);
        sum += src[row + sx];
        count++;
      }
      for (x = 0; x < W; x++) {
        tmp[row + x] = sum / count;
        var outX = x + r + 1;
        var inX = x - r;
        if (outX < W) {
          sum += src[row + outX];
          count++;
        }
        if (inX >= 0) {
          sum -= src[row + inX];
          count--;
        }
      }
    }
    var dst = new Float32Array(W * H);
    // 纵向盒状模糊
    for (x = 0; x < W; x++) {
      sum = 0;
      count = 0;
      for (k = -r; k <= r; k++) {
        var sy = k < 0 ? 0 : (k >= H ? H - 1 : k);
        sum += tmp[sy * W + x];
        count++;
      }
      for (y = 0; y < H; y++) {
        dst[y * W + x] = sum / count;
        var outY = y + r + 1;
        var inY = y - r;
        if (outY < H) {
          sum += tmp[outY * W + x];
          count++;
        }
        if (inY >= 0) {
          sum -= tmp[inY * W + x];
          count--;
        }
      }
    }
    return dst;
  }

  function applyFilter() {
    if (!base) return;
    var strength = (parseInt(strengthEl.value, 10) || 75) / 100;
    var radius = parseInt(radiusEl.value, 10) || 3;
    if (radiusText) radiusText.textContent = radius + " px";
    var g = grayArray();
    var inv = new Float32Array(W * H);
    var n = W * H;
    for (var i = 0; i < n; i++) inv[i] = 255 - g[i];
    var blurred = blurGray(inv, radius);
    var out = ctx.createImageData(W, H);
    var od = out.data;
    var gray = 0, val = 0, v, j, den;
    for (i = 0; i < n; i++) {
      den = 255 - blurred[i];
      // 颜色减淡
      val = den <= 0 ? 255 : Math.min(255, (g[i] * 255) / den);
      // 反转为铅笔线稿后按强度与原灰度混合
      v = 255 - val;
      gray = g[i];
      v = v * strength + gray * (1 - strength);
      j = i * 4;
      od[j] = od[j + 1] = od[j + 2] = v;
      od[j + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (strengthEl) strengthEl.addEventListener("input", applyFilter);
  if (radiusEl) radiusEl.addEventListener("input", applyFilter);

  drawSample();
})();
