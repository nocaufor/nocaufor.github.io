/* miniapp-poster.js：在线演示 —— Canvas 2D 海报生成
   （渐变背景 / 圆形头像 / 昵称 / 文案换行 / 二维码 / 下载 PNG）
   逻辑与工程 miniprogram/utils/poster-core.js、poster.js 一致（CSP 兼容，无内联） */
(function () {
  "use strict";

  var DESIGN = { width: 600, height: 900, avatarSize: 120, qrSize: 220, padding: 48 };
  var BG_FROM = "#1b2f63";
  var BG_TO = "#0e1730";

  function $(id) { return document.getElementById(id); }

  function layout(design) {
    var W = design.width, H = design.height;
    var pad = design.padding == null ? 48 : design.padding;
    var avatarD = design.avatarSize == null ? 120 : design.avatarSize;
    var qrSize = design.qrSize == null ? 220 : design.qrSize;
    var avatarR = avatarD / 2;
    var avatarCy = pad + avatarR;
    return {
      avatar: { x: W / 2, y: avatarCy, r: avatarR, d: avatarD },
      name: { x: W / 2, y: avatarCy + avatarR + 56, size: 36 },
      slogan: { x: W / 2, y: avatarCy + avatarR + 108, size: 26, maxWidth: W - pad * 2 },
      qr: { x: (W - qrSize) / 2, y: H - pad - qrSize - 36, size: qrSize },
      tip: { x: W / 2, y: H - pad, size: 22 }
    };
  }

  function wrapText(text, maxWidth, measure) {
    var s = String(text == null ? "" : text);
    if (!s) return [""];
    var lines = [], cur = "";
    for (var i = 0; i < s.length; i++) {
      var next = cur + s[i];
      if (cur && measure(next) > maxWidth) { lines.push(cur); cur = s[i]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
  }

  /* 伪二维码：基于 seed 的确定性 21×21 图案（含 3 个定位角），避免引入二维码库 */
  function drawFakeQr(ctx, x, y, size, seed) {
    var n = 21, cell = size / n;
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, size, size);
    function finder(fx, fy) {
      ctx.fillStyle = "#0e1730";
      ctx.fillRect(x + fx * cell, y + fy * cell, cell * 7, cell * 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5);
      ctx.fillStyle = "#0e1730";
      ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3);
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);

    ctx.fillStyle = "#0e1730";
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        var inFinder = (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
        if (inFinder) continue;
        if (rnd() > 0.52) ctx.fillRect(x + c * cell, y + r * cell, cell + 0.5, cell + 0.5);
      }
    }
  }

  function draw() {
    var canvas = $("mp-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var L = layout(DESIGN);
    ctx.clearRect(0, 0, DESIGN.width, DESIGN.height);

    /* 1) 渐变背景 */
    var bg = ctx.createLinearGradient(0, 0, 0, DESIGN.height);
    bg.addColorStop(0, BG_FROM);
    bg.addColorStop(1, BG_TO);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, DESIGN.width, DESIGN.height);

    /* 2) 圆形头像：径向渐变圆 + 首字母（工程内为 drawImage 头像图） */
    var a = L.avatar;
    ctx.save();
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
    ctx.clip();
    var av = ctx.createRadialGradient(a.x - 20, a.y - 20, 8, a.x, a.y, a.r);
    av.addColorStop(0, "#4f9d8f");
    av.addColorStop(1, "#1b3a5c");
    ctx.fillStyle = av;
    ctx.fillRect(a.x - a.r, a.y - a.r, a.d, a.d);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold " + a.r + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", a.x, a.y + 2);
    ctx.restore();

    /* 3) 昵称（居中，过长自动换行） */
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + L.name.size + "px sans-serif";
    wrapText("nocau 小程序分享", L.slogan.maxWidth, function (t) { return ctx.measureText(t).width; })
      .forEach(function (line, i) { ctx.fillText(line, L.name.x, L.name.y + i * (L.name.size + 8)); });

    /* 4) 说明文案 */
    ctx.font = L.slogan.size + "px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    wrapText("长按识别二维码，一起来玩", L.slogan.maxWidth, function (t) { return ctx.measureText(t).width; })
      .forEach(function (line, i) { ctx.fillText(line, L.slogan.x, L.slogan.y + i * (L.slogan.size + 8)); });

    /* 5) 二维码（白色圆角底 + 伪二维码图案） */
    ctx.fillStyle = "#ffffff";
    roundRectPath(ctx, L.qr.x - 12, L.qr.y - 12, L.qr.size + 24, L.qr.size + 24, 16);
    ctx.fill();
    drawFakeQr(ctx, L.qr.x, L.qr.y, L.qr.size, "nocau-poster-demo");

    /* 6) 底部提示 */
    ctx.font = L.tip.size + "px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("nocau · 小程序分享海报", L.tip.x, L.tip.y);

    var dl = $("mp-download");
    if (dl) dl.disabled = false;
    setStatus("海报已生成（600×900 设计稿，真机按 pixelRatio 缩放导出）。");
  }

  function download() {
    var canvas = $("mp-canvas");
    if (!canvas) return;
    try {
      var a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "poster_20260930.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus("已导出 PNG（下载由浏览器接管；工程内由 wx.saveImageToPhotosAlbum 存相册）。");
    } catch (e) {
      setStatus("导出失败：" + e.message);
    }
  }

  function setStatus(text) { var el = $("mp-status"); if (el) el.textContent = text; }

  function init() {
    if (!$("mp-demo")) return;
    var drawBtn = $("mp-draw");
    if (drawBtn) drawBtn.addEventListener("click", draw);
    var dlBtn = $("mp-download");
    if (dlBtn) dlBtn.addEventListener("click", download);
    draw(); /* 页面打开即有一张可预览海报 */
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
