/* nocau · 万花筒 — 径向对称镜像拼贴，零依赖纯本地像素实现 */
(function () {
  "use strict";

  var cv = document.getElementById("kl-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var fileEl = document.getElementById("kl-file");
  var sampleBtn = document.getElementById("kl-sample");
  var nEl = document.getElementById("kl-n");
  var numEl = document.getElementById("kl-num");
  var statusEl = document.getElementById("kl-status");
  var W = cv.width, H = cv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    ctx.fillStyle = "#070a10";
    ctx.fillRect(0, 0, W, H);
    var colors = ["#f25c54", "#f27059", "#f79d65", "#f7d08a", "#83b5d1", "#596fc1", "#8e7cc3", "#5bc8af"];
    for (var i = 0; i < colors.length; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(W * (0.2 + (i % 4) * 0.2), H * (0.24 + Math.floor(i / 4) * 0.52), 110, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#fdf0d5";
    ctx.lineWidth = 16;
    for (var r = 1; r <= 6; r++) {
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.5, 36 + r * 52, 0.4 + r * 0.2, 2.2 + r * 0.13);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffe8b5";
    ctx.font = "bold 100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MIRROR", W * 0.5, H * 0.88);
    base = ctx.getImageData(0, 0, W, H);
    render();
    setStatus("示例图已载入，调节份数生成不同图案");
  }

  function drawUploaded(img) {
    var side = Math.min(W, H);
    var scale = Math.min(side / img.width, side / img.height);
    var w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#070a10";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = ctx.getImageData(0, 0, W, H);
    render();
    setStatus("图片已载入，当前为万花筒效果");
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

  function render() {
    if (!base) return;
    var n = Math.max(3, Math.min(24, parseInt(nEl.value, 10) || 8));
    if (numEl) numEl.textContent = n;
    var sector = (Math.PI * 2) / n;
    var cx = W / 2, cy = H / 2;
    var maxR = Math.sqrt(cx * cx + cy * cy);
    var data = base.data;
    var out = ctx.createImageData(W, H);
    var od = out.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var dx = x - cx, dy = y - cy;
        var r = Math.sqrt(dx * dx + dy * dy);
        var ang = Math.atan2(dy, dx);
        if (ang < 0) ang += Math.PI * 2;
        var sec = Math.floor(ang / sector);
        var off = ang - sec * sector;
        // 相邻扇区镜像，形成反射对称
        if (sec % 2 === 1) off = sector - off;
        // 角度映射到源图横向，半径映射到源图纵向
        var sx = (off / sector) * (W - 1);
        var sy = Math.min(H - 1, (r / maxR) * (H - 1));
        var si = (Math.floor(sy) * W + Math.floor(sx)) * 4;
        var oi = (y * W + x) * 4;
        od[oi] = data[si];
        od[oi + 1] = data[si + 1];
        od[oi + 2] = data[si + 2];
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
  if (nEl) nEl.addEventListener("input", render);

  drawSample();
})();
