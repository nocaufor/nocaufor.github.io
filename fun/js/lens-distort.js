/* nocau · 镜头扭曲滤镜 — 鱼眼/膨胀/漩涡/波纹逐像素逆映射，零依赖纯本地实现 */
(function () {
  "use strict";

  var cv = document.getElementById("ld-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("ld-file");
  var sampleBtn = document.getElementById("ld-sample");
  var strengthEl = document.getElementById("ld-strength");
  var effectEl = document.getElementById("ld-effect");
  var statusEl = document.getElementById("ld-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    ctx.fillStyle = "#0c1117";
    ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(W * 0.3, H * 0.35, 20, W * 0.5, H * 0.5, 420);
    g.addColorStop(0, "#ffd166");
    g.addColorStop(0.5, "#f25c54");
    g.addColorStop(1, "#23395d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    for (var i = 0; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * (H / 12));
      ctx.lineTo(W, i * (H / 12));
      ctx.stroke();
    }
    for (var j = 0; j <= 18; j++) {
      ctx.beginPath();
      ctx.moveTo(j * (W / 18), 0);
      ctx.lineTo(j * (W / 18), H);
      ctx.stroke();
    }
    ctx.fillStyle = "#1d3557";
    ctx.font = "bold 96px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("LENS", W * 0.5, H * 0.58);
    base = ctx.getImageData(0, 0, W, H);
    render();
    setStatus("示例图已载入，切换效果与强度实时预览");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#0a0d12";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    render();
    setStatus("图片已载入，当前为扭曲效果");
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

  function sample(data, fx, fy) {
    // 双线性采样；越界返回暗色背景
    if (fx < 0 || fy < 0 || fx >= W - 1 || fy >= H - 1) return [10, 13, 18];
    var x0 = Math.floor(fx), y0 = Math.floor(fy);
    var tx = fx - x0, ty = fy - y0;
    var i00 = (y0 * W + x0) * 4;
    var i10 = i00 + 4;
    var i01 = ((y0 + 1) * W + x0) * 4;
    var i11 = i01 + 4;
    var out = [];
    for (var c = 0; c < 3; c++) {
      var v00 = data[i00 + c], v10 = data[i10 + c], v01 = data[i01 + c], v11 = data[i11 + c];
      out.push((v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty);
    }
    return out;
  }

  function render() {
    if (!base) return;
    var effect = effectEl.value;
    var s = (parseInt(strengthEl.value, 10) || 60) / 100;
    var data = base.data;
    var out = ctx.createImageData(W, H);
    var od = out.data;
    var cx = (W - 1) / 2, cy = (H - 1) / 2;
    var maxR = Math.min(W, H) / 2;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var u = (x - cx) / maxR;
        var v = (y - cy) / maxR;
        var r = Math.sqrt(u * u + v * v);
        var su = u, sv = v;
        if (effect === "none") {
          // 原样
        } else if (effect === "fish") {
          // 鱼眼：中心被放大，边缘向四周展开
          var f = 1 + s * r * r;
          su = u / f;
          sv = v / f;
        } else if (effect === "bulge") {
          // 膨胀：中心鼓起，可视为边缘向中心聚拢
          var k = 0.55 * s;
          if (r < 1) {
            var rr = Math.pow(Math.max(r, 0.0001), 1 - k);
            var ratio = rr / Math.max(r, 0.0001);
            su = u * ratio;
            sv = v * ratio;
          }
        } else if (effect === "swirl") {
          // 漩涡：角度随半径旋转
          var ang = Math.atan2(v, u);
          var theta = ang + s * 5.2 * (1 - r);
          var sr2 = r;
          su = Math.cos(theta) * sr2;
          sv = Math.sin(theta) * sr2;
        } else if (effect === "wave") {
          // 波纹：沿两个方向的径向正弦扰动
          var amp = 0.11 * s;
          su = u + Math.sin(v * 9 + r * 7) * amp;
          sv = v + Math.cos(u * 9 + r * 7) * amp;
        }
        var fx = su * maxR + cx;
        var fy = sv * maxR + cy;
        var pix = sample(data, fx, fy);
        var oi = (y * W + x) * 4;
        od[oi] = pix[0];
        od[oi + 1] = pix[1];
        od[oi + 2] = pix[2];
        od[oi + 3] = 255;
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (strengthEl) strengthEl.addEventListener("input", render);
  if (effectEl) effectEl.addEventListener("change", render);

  drawSample();
})();
