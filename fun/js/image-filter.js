/* nocau fun: 图像滤镜（像素级本地算法） */
(function () {
  var cv = document.getElementById("if-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 780, H = 520;
  cv.width = W; cv.height = H;
  var base = null; // ImageData
  var current = "原图";
  var strength = 0.6;
  var statusEl = document.getElementById("if-status");
  var nameEl = document.getElementById("if-name");

  function newBuf() {
    var d = ctx.createImageData(W, H);
    return d;
  }
  function clamp(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
  function lum(i, data) { return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; }
  function mix(a, b, t) { return a * (1 - t) + b * t; }

  /* 本地绘制示例图（内容足够丰富以展示边缘/滤镜效果） */
  function drawSample() {
    ctx.save();
    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0e2a3a");
    g.addColorStop(1, "#143047");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 色带与几何图形
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#f3a953";
    ctx.fillRect(60, 70, 300, 130);
    ctx.fillStyle = "#e05c6b";
    ctx.beginPath(); ctx.arc(560, 250, 88, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5ec8d8";
    ctx.beginPath();
    var cx = 240, cy = 330;
    for (var k = 0; k < 5; k++) {
      var r1 = 62, r2 = 26, a0 = -Math.PI / 2 + k * (Math.PI * 2 / 5);
      var x1 = cx + r1 * Math.cos(a0), y1 = cy + r1 * Math.sin(a0);
      var a1 = a0 + Math.PI / 5;
      var x2 = cx + r2 * Math.cos(a1), y2 = cy + r2 * Math.sin(a1);
      ctx.lineTo(k === 0 ? x1 : x1, k === 0 ? y1 : y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#9b8cf0";
    ctx.fillRect(360, 380, 130, 86);
    ctx.strokeStyle = "#eaf7ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(180, 130, 240, 90);
    ctx.fillStyle = "#fff3d6";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText("FILTER", 472, 158);
    ctx.restore();
    base = ctx.getImageData(0, 0, W, H);
    apply();
  }

  /* 通用 3x3 卷积（src/dst RGBA，边缘保持原样） */
  function convolve(src, dst, kernel, div, offset) {
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
          var bi = (y * W + x) * 4;
          dst[bi] = src[bi]; dst[bi + 1] = src[bi + 1]; dst[bi + 2] = src[bi + 2]; dst[bi + 3] = src[bi + 3];
          continue;
        }
        var sum = [0, 0, 0];
        for (var ky = -1; ky <= 1; ky++) {
          for (var kx = -1; kx <= 1; kx++) {
            var si = ((y + ky) * W + (x + kx)) * 4;
            var kk = kernel[(ky + 1) * 3 + (kx + 1)];
            sum[0] += src[si] * kk; sum[1] += src[si + 1] * kk; sum[2] += src[si + 2] * kk;
          }
        }
        var di = (y * W + x) * 4;
        dst[di] = clamp(sum[0] / div + offset); dst[di + 1] = clamp(sum[1] / div + offset); dst[di + 2] = clamp(sum[2] / div + offset); dst[di + 3] = src[di + 3];
      }
    }
  }

  function apply() {
    if (!base) return;
    var out = newBuf();
    var d = out.data, s = base.data;
    var t = strength;
    switch (current) {
      case "原图": ctx.putImageData(base, 0, 0); break;
      case "灰度":
        for (var i = 0; i < d.length; i += 4) { var g = lum(i, s); d[i] = mix(s[i], g, t); d[i + 1] = mix(s[i + 1], g, t); d[i + 2] = mix(s[i + 2], g, t); d[i + 3] = 255; }
        ctx.putImageData(out, 0, 0); break;
      case "反色":
        for (var j = 0; j < d.length; j += 4) { d[j] = mix(s[j], 255 - s[j], t); d[j + 1] = mix(s[j + 1], 255 - s[j + 1], t); d[j + 2] = mix(s[j + 2], 255 - s[j + 2], t); d[j + 3] = 255; }
        ctx.putImageData(out, 0, 0); break;
      case "锐化": {
        var sharp = newBuf();
        convolve(s, sharp.data, [0, -1, 0, -1, 5, -1, 0, -1, 0], 1, 0);
        var sd = sharp.data;
        for (var k3 = 0; k3 < d.length; k3 += 4) { d[k3] = mix(s[k3], sd[k3], t * 0.9); d[k3 + 1] = mix(s[k3 + 1], sd[k3 + 1], t * 0.9); d[k3 + 2] = mix(s[k3 + 2], sd[k3 + 2], t * 0.9); d[k3 + 3] = 255; }
        ctx.putImageData(out, 0, 0); break;
      }
      case "模糊": {
        var box = newBuf();
        var r = 1 + Math.round(t * 2);
        convolve(s, box.data, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9, 0); // 第一遍
        var box2 = newBuf();
        convolve(box.data, box2.data, [1, 1, 1, 1, 1, 1, 1, 1, 1], 9, 0); // 第二遍加深
        var bd = box2.data;
        for (var kb = 0; kb < d.length; kb += 4) { d[kb] = mix(s[kb], bd[kb], Math.min(0.95, t)); d[kb + 1] = mix(s[kb + 1], bd[kb + 1], Math.min(0.95, t)); d[kb + 2] = mix(s[kb + 2], bd[kb + 2], Math.min(0.95, t)); d[kb + 3] = 255; }
        ctx.putImageData(out, 0, 0); break;
      }
      case "边缘": {
        // Sobel 亮度梯度
        for (var y2 = 0; y2 < H; y2++) {
          for (var x2 = 0; x2 < W; x2++) {
            var di2 = (y2 * W + x2) * 4;
            if (x2 === 0 || y2 === 0 || x2 === W - 1 || y2 === H - 1) { d[di2] = 0; d[di2 + 1] = 0; d[di2 + 2] = 0; d[di2 + 3] = 255; continue; }
            var tl = lum((y2 - 1) * W * 4 + (x2 - 1) * 4, s), tc = lum((y2 - 1) * W * 4 + x2 * 4, s), tr = lum((y2 - 1) * W * 4 + (x2 + 1) * 4, s);
            var ml = lum(y2 * W * 4 + (x2 - 1) * 4, s), mr = lum(y2 * W * 4 + (x2 + 1) * 4, s);
            var bl = lum((y2 + 1) * W * 4 + (x2 - 1) * 4, s), bc = lum((y2 + 1) * W * 4 + x2 * 4, s), br = lum((y2 + 1) * W * 4 + (x2 + 1) * 4, s);
            var gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
            var gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
            var mag = Math.sqrt(gx * gx + gy * gy);
            var v = clamp((mag / 12 - (1 - t) * 10) * 1.4);
            d[di2] = v; d[di2 + 1] = v; d[di2 + 2] = v; d[di2 + 3] = 255;
          }
        }
        ctx.putImageData(out, 0, 0); break;
      }
    }
  }

  // 文件加载
  document.getElementById("if-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var img = new Image();
    img.onload = function () {
      ctx.clearRect(0, 0, W, H);
      var scale = Math.min(W / img.width, H / img.height);
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      ctx.fillStyle = "rgba(8,12,16,0.35)";
      ctx.fillRect(0, 0, W, H); // 深色底衬，便于观察边缘效果
      base = ctx.getImageData(0, 0, W, H);
      apply();
      if (statusEl) statusEl.textContent = "已载入 " + file.name;
    };
    img.src = URL.createObjectURL(file);
  });

  var buttons = document.querySelectorAll("[data-filter]");
  for (var b = 0; b < buttons.length; b++) {
    buttons[b].addEventListener("click", function () {
      current = this.getAttribute("data-filter");
      if (nameEl) nameEl.textContent = "当前：" + current;
      apply();
    });
  }
  document.getElementById("if-strength").addEventListener("input", function (e) { strength = parseFloat(e.target.value); apply(); });
  document.getElementById("if-sample").addEventListener("click", drawSample);

  if (!base) drawSample();
})();
