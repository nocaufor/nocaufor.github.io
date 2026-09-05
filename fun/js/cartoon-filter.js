/* nocau fun P000037: 卡通 / 水彩滤镜（边缘增强 + 色阶量化 + 柔化，本地算法） */
(function () {
  "use strict";
  var cv = document.getElementById("cf-canvas");
  var ctx = cv.getContext("2d");
  var nameEl = document.getElementById("cf-name");
  var statusEl = document.getElementById("cf-status");
  var srcData = null, mode = "cartoon", imgW = 0, imgH = 0;

  function setStatus(m, err) { statusEl.textContent = m; statusEl.style.color = err ? "#e06c75" : "var(--color-muted,#9aa3b2)"; }
  function quantize(v, level) {
    return Math.round(v / 255 * (level - 1)) * (255 / (level - 1));
  }
  function edgeMagnitude(d, w, h, x, y) {
    var i = (y * w + x) * 4;
    var r = d[i], g = d[i + 1], b = d[i + 2];
    var L = 0.299 * r + 0.587 * g + 0.114 * b;
    if (x === 0 || y === 0 || x >= w - 1 || y >= h - 1) return 0;
    var l = 0.299 * d[(y * w + x - 1) * 4] + 0.587 * d[(y * w + x - 1) * 4 + 1] + 0.114 * d[(y * w + x - 1) * 4 + 2];
    var rr = 0.299 * d[(y * w + x + 1) * 4] + 0.587 * d[(y * w + x + 1) * 4 + 1] + 0.114 * d[(y * w + x + 1) * 4 + 2];
    var u = 0.299 * d[((y - 1) * w + x) * 4] + 0.587 * d[((y - 1) * w + x) * 4 + 1] + 0.114 * d[((y - 1) * w + x) * 4 + 2];
    var dd = 0.299 * d[((y + 1) * w + x) * 4] + 0.587 * d[((y + 1) * w + x) * 4 + 1] + 0.114 * d[((y + 1) * w + x) * 4 + 2];
    return Math.abs(L - l) + Math.abs(L - rr) + Math.abs(L - u) + Math.abs(L - dd);
  }
  function boxBlur(data, w, h, r) {
    var out = new Uint8ClampedArray(data.length);
    var k = (r * 2 + 1) * (r * 2 + 1);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var rSum = 0, gSum = 0, bSum = 0;
        for (var dy = -r; dy <= r; dy++) {
          var yy = Math.max(0, Math.min(h - 1, y + dy));
          for (var dx = -r; dx <= r; dx++) {
            var xx = Math.max(0, Math.min(w - 1, x + dx));
            var i = (yy * w + xx) * 4;
            rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
          }
        }
        var o = (y * w + x) * 4;
        out[o] = rSum / k; out[o + 1] = gSum / k; out[o + 2] = bSum / k; out[o + 3] = 255;
      }
    }
    return out;
  }
  function applyFilter() {
    if (!srcData) return;
    var level = parseInt(document.getElementById("cf-level").value, 10) || 6;
    var edgeK = parseFloat(document.getElementById("cf-edge").value) || 0.9;
    var w = imgW, h = imgH;
    var d = new Uint8ClampedArray(srcData);
    var out = new Uint8ClampedArray(srcData.length);
    if (mode === "water") {
      /* 水彩：轻度柔化 + 低饱和 + 分段提亮 */
      var blurred = boxBlur(d, w, h, 2);
      for (var i = 0; i < d.length; i += 4) {
        var r = blurred[i], g = blurred[i + 1], b = blurred[i + 2];
        var avg = (r + g + b) / 3;
        out[i] = quantize((r + avg) / 2 * 0.92 + 18, level);
        out[i + 1] = quantize((g + avg) / 2 * 0.92 + 18, level);
        out[i + 2] = quantize((b + avg) / 2 * 0.92 + 18, level);
        out[i + 3] = 255;
      }
    } else {
      /* 卡通：色阶量化 + 边缘墨线叠加（暗部用边缘亮度差画线） */
      for (var j = 0; j < d.length; j += 4) {
        out[j] = quantize(d[j], level);
        out[j + 1] = quantize(d[j + 1], level);
        out[j + 2] = quantize(d[j + 2], level);
        out[j + 3] = 255;
      }
      var edgeMax = 255 * 4 * 0.32;
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var e = edgeMagnitude(d, w, h, x, y);
          var t = Math.min(1, e / edgeMax) * edgeK;
          if (t > 0.16) {
            var p = (y * w + x) * 4;
            var ink = Math.max(0, 128 - t * 170);
            out[p] = ink; out[p + 1] = ink; out[p + 2] = ink * 1.12 + 20;
          }
        }
      }
    }
    ctx.putImageData(new ImageData(out, w, h), 0, 0);
    setStatus("已应用“" + (mode === "water" ? "水彩" : "卡通") + "”（层级 " + level + "，边缘 " + edgeK.toFixed(1) + "）。");
  }
  function loadImg(img) {
    var scale = Math.min(760 / img.naturalWidth, 480 / img.naturalHeight, 1);
    imgW = Math.max(80, Math.round(img.naturalWidth * scale));
    imgH = Math.max(80, Math.round(img.naturalHeight * scale));
    cv.width = imgW; cv.height = imgH;
    ctx.drawImage(img, 0, 0, imgW, imgH);
    srcData = ctx.getImageData(0, 0, imgW, imgH).data;
    nameEl.textContent = "当前：原图";
    applyFilter();
  }
  function makeSample() {
    var off = document.createElement("canvas"); off.width = 560; off.height = 350;
    var g = off.getContext("2d");
    var grad = g.createLinearGradient(0, 0, 560, 350);
    grad.addColorStop(0, "#ffd98e"); grad.addColorStop(0.45, "#f08a5d"); grad.addColorStop(1, "#845ec2");
    g.fillStyle = grad; g.fillRect(0, 0, 560, 350);
    g.fillStyle = "#fff8e8"; g.beginPath(); g.arc(120, 100, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f1c27d"; g.beginPath(); g.arc(240, 230, 78, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d97757"; g.beginPath(); g.arc(240, 230, 55, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3d5a80"; g.beginPath(); g.rect(360, 240, 150, 80); g.fill();
    g.fillStyle = "#e8ecf4"; g.font = "bold 56px Georgia,serif"; g.fillText("Cartoon", 60, 300);
    var img = new Image();
    img.onload = function () { loadImg(img); };
    img.src = off.toDataURL("image/png");
  }
  function handleFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { loadImg(img); URL.revokeObjectURL(url); };
    img.onerror = function () { setStatus("图片读取失败。", true); };
    img.src = url;
  }
  var btns = document.querySelectorAll("[data-mode]");
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener("click", function () {
      mode = this.getAttribute("data-mode");
      for (var q = 0; q < btns.length; q++) btns[q].classList.toggle("btn-primary", btns[q] === this && mode !== "orig");
      for (var r = 0; r < btns.length; r++) btns[r].classList.toggle("btn-outline", btns[r] === this ? mode === "orig" : true);
      if (mode === "orig") {
        if (srcData) { ctx.putImageData(new ImageData(new Uint8ClampedArray(srcData), imgW, imgH), 0, 0); setStatus("已显示原图。"); }
        nameEl.textContent = "当前：原图";
      } else {
        nameEl.textContent = "当前：" + (mode === "water" ? "水彩" : "卡通");
        applyFilter();
      }
    });
  }
  document.getElementById("cf-level").addEventListener("input", function () { if (mode !== "orig") applyFilter(); });
  document.getElementById("cf-edge").addEventListener("input", function () { if (mode === "cartoon") applyFilter(); });
  document.getElementById("cf-file").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); });
  document.getElementById("cf-sample").addEventListener("click", makeSample);
  makeSample();
})();
