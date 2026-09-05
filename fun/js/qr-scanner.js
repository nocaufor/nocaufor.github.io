/* nocau fun P000033: 二维码扫码（jsQR + qrcode 生成，均走 CDN，本地解码） */
(function () {
  "use strict";
  var cv = document.getElementById("qr-canvas");
  var video = document.getElementById("qr-video");
  var statusEl = document.getElementById("qr-status");
  var ctx = cv.getContext("2d", { willReadFrequently: true });
  var stream = null, scanTimer = 0;
  var lastResult = "", lastResultAt = 0;
  var busy = false;

  function setStatus(msg, err) {
    statusEl.textContent = msg;
    statusEl.style.color = err ? "#e06c75" : "var(--color-brand,#7aa2f7)";
  }
  function libReady() {
    return typeof window.jsQR === "function";
  }
  function genReady() {
    return typeof window.QRCode === "function";
  }
  function stopCam() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = 0; }
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    video.hidden = true; video.srcObject = null;
    cv.hidden = false;
  }
  function decodeFromCanvas(source, label) {
    if (!libReady()) { setStatus("jsQR 未加载成功：请检查网络或刷新重试（需访问 cdn.jsdelivr.net）。", true); return; }
    var w = cv.width, h = cv.height;
    try {
      var img = ctx.getImageData(0, 0, w, h);
      var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (code && code.data) {
        setStatus(label + " → " + code.data);
      } else {
        setStatus(label + "：未识别到二维码，请对准 / 换清晰图片。");
      }
    } catch (e) {
      console.error(e);
      setStatus("解码出错：" + (e && e.message ? e.message : e), true);
    }
  }
  function drawFile(file) {
    stopCam();
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      cv.hidden = false;
      var scale = Math.min(720 / img.naturalWidth, 500 / img.naturalHeight, 1);
      var w = Math.max(120, Math.round(img.naturalWidth * scale));
      var h = Math.max(90, Math.round(img.naturalHeight * scale));
      cv.width = w; cv.height = h;
      ctx.fillStyle = "#05070c"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      decodeFromCanvas(img, "图片解析结果");
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { setStatus("图片读取失败，请重试。", true); };
    img.src = url;
  }
  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("当前浏览器不支持摄像头，或需在 https / localhost 下访问。", true);
      return;
    }
    if (!libReady()) { setStatus("jsQR 未加载成功：请检查网络或刷新重试。", true); return; }
    stopCam();
    setStatus("请求摄像头权限中…");
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 960 }, height: { ideal: 540 } }, audio: false })
      .then(function (s) {
        stream = s;
        video.hidden = false; cv.hidden = true;
        video.srcObject = s;
        video.play().catch(function () {});
        setStatus("摄像头已开启，将画面中的二维码对准取景框…");
        scanTimer = setInterval(scanFrame, 160);
      })
      .catch(function (e) {
        console.error(e);
        setStatus("摄像头不可用：" + (e && e.name ? e.name : e) + "。可改用上传图片。", true);
      });
  }
  function scanFrame() {
    if (!stream || video.readyState < 2 || video.videoWidth < 2) return;
    if (busy) return;
    busy = true;
    var scale = Math.min(640 / video.videoWidth, 360 / video.videoHeight, 1);
    var w = Math.max(120, Math.round(video.videoWidth * scale));
    var h = Math.max(90, Math.round(video.videoHeight * scale));
    cv.width = w; cv.height = h;
    ctx.drawImage(video, 0, 0, w, h);
    if (!libReady()) { busy = false; return; }
    try {
      var img = ctx.getImageData(0, 0, w, h);
      var code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      var now = Date.now();
      if (code && code.data && (code.data !== lastResult || now - lastResultAt > 800)) {
        lastResult = code.data; lastResultAt = now;
        setStatus("实时识别 → " + code.data);
      }
    } catch (e) {}
    busy = false;
  }
  function makeSample() {
    stopCam();
    if (!genReady()) { setStatus("qrcode 生成库未加载成功，无法生成示例。", true); return; }
    cv.hidden = false;
    cv.width = 320; cv.height = 320;
    setStatus("正在生成示例二维码…");
    try {
      window.QRCode.toCanvas(cv, "https://nocau.com/fun/index.html?from=qr-demo", { width: 320, margin: 1, color: { dark: "#e8ecf4", light: "#0b0e16" } }, function (err) {
        if (err) { setStatus("生成失败：" + err.message, true); return; }
        setStatus("示例已生成，正在解码验证…");
        setTimeout(function () { decodeFromCanvas(cv, "示例解码结果"); }, 60);
      });
    } catch (e) {
      setStatus("生成异常：" + (e && e.message ? e.message : e), true);
    }
  }

  document.getElementById("qr-cam").addEventListener("click", startCamera);
  var fileInput = document.getElementById("qr-file");
  if (fileInput) fileInput.addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) drawFile(f); });
  document.getElementById("qr-sample").addEventListener("click", makeSample);
  window.addEventListener("pagehide", stopCam);

  if (!libReady()) {
    setStatus("jsQR 库加载失败：离线或 CDN 不可用，请联网后刷新。", true);
  } else {
    setStatus("jsQR 就绪。可开启摄像头扫码、上传二维码图片或点“生成示例二维码”。");
  }
})();
