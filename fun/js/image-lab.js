/* nocau fun: 图像处理实验（Sobel/素描/浮雕 对照） */
(function () {
  var oCv = document.getElementById("il-orig");
  var oCtx = oCv.getContext("2d");
  var outCv = document.getElementById("il-out");
  var outCtx = outCv.getContext("2d");
  var W = 520, H = 340;
  oCv.width = W; oCv.height = H; outCv.width = W; outCv.height = H;
  var mode = "sobel";
  var t = 0.35;
  var statusEl = document.getElementById("il-status");
  var labelEl = document.getElementById("il-out-label");

  function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
  function lum(i, d) { return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; }
  function grayBuf(src) {
    var out = oCtx.createImageData(W, H);
    for (var i = 0; i < src.length; i += 4) { var g = lum(i, src); out.data[i] = g; out.data[i + 1] = g; out.data[i + 2] = g; out.data[i + 3] = 255; }
    return out;
  }
  function blurGray(src) {
    var out = oCtx.createImageData(W, H);
    var d = out.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var di = (y * W + x) * 4;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { d[di] = src[di]; d[di + 1] = src[di + 1]; d[di + 2] = src[di + 2]; d[di + 3] = 255; continue; }
        var sum = 0;
        for (var ky = -1; ky <= 1; ky++) for (var kx = -1; kx <= 1; kx++) sum += src[((y + ky) * W + (x + kx)) * 4];
        var v = sum / 9;
        d[di] = v; d[di + 1] = v; d[di + 2] = v; d[di + 3] = 255;
      }
    }
    return out;
  }
  function drawSample() {
    oCtx.save();
    var g = oCtx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#10223a"); g.addColorStop(1, "#1d3048");
    oCtx.fillStyle = g; oCtx.fillRect(0, 0, W, H);
    oCtx.fillStyle = "#f0b460"; oCtx.fillRect(50, 60, 220, 90);
    oCtx.fillStyle = "#e86a6a"; oCtx.beginPath(); oCtx.arc(330, 190, 55, 0, Math.PI * 2); oCtx.fill();
    oCtx.fillStyle = "#5fd0e0"; oCtx.fillRect(180, 220, 150, 60);
    oCtx.strokeStyle = "#f5e9c8"; oCtx.lineWidth = 4; oCtx.strokeRect(60, 120, 240, 120);
    oCtx.font = "bold 30px sans-serif"; oCtx.fillStyle = "#ffffff"; oCtx.fillText("LAB", 300, 320);
    oCtx.restore();
    run();
  }
  function setFromData(data) { oCtx.putImageData(data, 0, 0); run(); }
  function run() {
    var data = oCtx.getImageData(0, 0, W, H);
    var src = data.data;
    var out;
    if (mode === "原图") {
      outCtx.putImageData(data, 0, 0);
      return;
    }
    var threshold = Math.max(2, Math.round(t * 80));
    if (mode === "sobel") {
      out = oCtx.createImageData(W, H);
      var od = out.data;
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var di = (y * W + x) * 4;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { od[di] = 0; od[di + 1] = 0; od[di + 2] = 0; od[di + 3] = 255; continue; }
        var tl = lum((y - 1) * W * 4 + (x - 1) * 4, src), tc = lum((y - 1) * W * 4 + x * 4, src), tr = lum((y - 1) * W * 4 + (x + 1) * 4, src);
        var ml = lum(y * W * 4 + (x - 1) * 4, src), mr = lum(y * W * 4 + (x + 1) * 4, src);
        var bl = lum((y + 1) * W * 4 + (x - 1) * 4, src), bc = lum((y + 1) * W * 4 + x * 4, src), br = lum((y + 1) * W * 4 + (x + 1) * 4, src);
        var gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
        var gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
        var mag = Math.sqrt(gx * gx + gy * gy);
        var v = mag > threshold ? 235 : 12;
        od[di] = v; od[di + 1] = v; od[di + 2] = v; od[di + 3] = 255;
      }
      outCtx.putImageData(out, 0, 0);
    } else if (mode === "sketch") {
      var g0 = grayBuf(src);
      var gb = blurGray(g0.data);
      var gd = g0.data;
      out = oCtx.createImageData(W, H);
      var o2 = out.data;
      for (var k = 0; k < o2.length; k += 4) {
        // 颜色减淡：白 = 亮度255-模糊亮度，输出深色笔迹
        var baseV = gd[k];        // 原亮度
        var blurV = gb.data[k];   // 模糊亮度
        var blend = baseV === 255 ? 255 : Math.min(255, (baseV * 255) / (255 - blurV + 1));
        var pencil = 255 - blend;
        var v2 = clamp(mix(baseV * 0.6 + 40, pencil, 0.75));
        o2[k] = v2; o2[k + 1] = v2; o2[k + 2] = v2; o2[k + 3] = 255;
      }
      outCtx.putImageData(out, 0, 0);
    } else if (mode === "emboss") {
      out = oCtx.createImageData(W, H);
      var eo = out.data;
      for (var y3 = 0; y3 < H; y3++) for (var x3 = 0; x3 < W; x3++) {
        var di3 = (y3 * W + x3) * 4;
        if (x3 === 0 || y3 === 0 || x3 === W - 1 || y3 === H - 1) { eo[di3] = 128; eo[di3 + 1] = 128; eo[di3 + 2] = 128; eo[di3 + 3] = 255; continue; }
        var tl2 = lum((y3 - 1) * W * 4 + (x3 - 1) * 4, src), tc2 = lum((y3 - 1) * W * 4 + x3 * 4, src), tr2 = lum((y3 - 1) * W * 4 + (x3 + 1) * 4, src);
        var ml2 = lum(y3 * W * 4 + (x3 - 1) * 4, src), mr2 = lum(y3 * W * 4 + (x3 + 1) * 4, src);
        var bl2 = lum((y3 + 1) * W * 4 + (x3 - 1) * 4, src), bc2 = lum((y3 + 1) * W * 4 + x3 * 4, src), br2 = lum((y3 + 1) * W * 4 + (x3 + 1) * 4, src);
        var v3 = clamp(-tl2 - 2 * tc2 - tr2 + ml2 + mr2 + bl2 + 2 * bc2 + br2 + 128);
        eo[di3] = v3; eo[di3 + 1] = v3; eo[di3 + 2] = v3; eo[di3 + 3] = 255;
      }
      outCtx.putImageData(out, 0, 0);
    }
  }

  document.getElementById("il-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var img = new Image();
    img.onload = function () {
      oCtx.clearRect(0, 0, W, H);
      var scale = Math.min(W / img.width, H / img.height);
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      oCtx.fillStyle = "#101820"; oCtx.fillRect(0, 0, W, H);
      oCtx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      if (statusEl) statusEl.textContent = "已载入 " + file.name;
      run();
    };
    img.src = URL.createObjectURL(file);
  });
  document.getElementById("il-threshold").addEventListener("input", function (e) { t = parseFloat(e.target.value); run(); });
  document.getElementById("il-sample").addEventListener("click", function () { drawSample(); if (statusEl) statusEl.textContent = "已重新生成示例图"; });
  var buttons = document.querySelectorAll("[data-mode]");
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function () {
      mode = this.getAttribute("data-mode");
      if (labelEl) labelEl.textContent = mode === "原图" ? "原图（镜像）" : mode;
      run();
    });
  }
  drawSample();
  if (statusEl) statusEl.textContent = "示例图已生成；阈值滑块实时影响边缘/素描/浮雕强度。";
})();
