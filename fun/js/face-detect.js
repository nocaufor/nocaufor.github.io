/* nocau fun: 人脸识别（face-api.js，浏览器本地检测） */
(function () {
  var cv = document.getElementById("fd-canvas");
  var statusEl = document.getElementById("fd-status");
  var ctx = cv.getContext("2d");
  var modelUrl = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
  var assetsLoaded = false;
  var imgData = null; // {w,h,dataURL?} -> use HTMLImageElement cache
  var currentImg = null;

  function setStatus(msg, err) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "fd-status" + (err ? " fd-err" : "");
  }
  function ready() {
    return typeof window.faceapi !== "undefined" && window.faceapi.nets;
  }
  function fitImage(img) {
    // 等比缩放至画布显示区域，长边 ≤720
    var scale = Math.min(720 / img.naturalWidth, 480 / img.naturalHeight, 1);
    var w = Math.round(img.naturalWidth * scale);
    var h = Math.round(img.naturalHeight * scale);
    return { w: Math.max(1, w), h: Math.max(1, h) };
  }
  function drawImageToCanvas(img) {
    var size = fitImage(img);
    cv.width = size.w; cv.height = size.h;
    ctx.fillStyle = "#0c0f14"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, size.w, size.h);
  }
  async function loadAssets() {
    if (assetsLoaded || !ready()) return;
    setStatus("加载轻量模型（tiny face detector + 关键点）中…");
    try {
      await window.faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
      await window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);
      assetsLoaded = true;
      setStatus("模型已就绪，可开始检测。");
    } catch (e) {
      console.error(e);
      setStatus("模型加载失败：请检查网络后刷新重试（需要可访问 cdn.jsdelivr.net）。", true);
      throw e;
    }
  }
  async function detectAndDraw(img) {
    if (!ready()) { setStatus("face-api.js 未加载（CDN 不可用或离线）。", true); return; }
    drawImageToCanvas(img);
    currentImg = img;
    setStatus("正在检测…");
    try {
      await loadAssets();
      var opts = new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
      var results = await window.faceapi.detectAllFaces(cv, opts).withFaceLandmarks();
      ctx.strokeStyle = "#64e0a0"; ctx.lineWidth = 2;
      for (var r = 0; r < results.length; r++) {
        var d = results[r].detection;
        var box = d.box;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "rgba(18,32,26,0.78)";
        ctx.fillRect(box.x, box.y - 18, Math.min(box.width, 130), 18);
        ctx.fillStyle = "#64e0a0"; ctx.font = "12px sans-serif";
        ctx.fillText("face " + (d.score * 100).toFixed(1) + "%", box.x + 4, box.y - 5);
        if (results[r].landmarks) {
          var pts = results[r].landmarks.positions;
          ctx.fillStyle = "rgba(255,214,120,0.9)";
          for (var p = 0; p < pts.length; p++) {
            ctx.beginPath(); ctx.arc(pts[p].x, pts[p].y, 1.6, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      setStatus(results.length ? "检测到 " + results.length + " 张人脸（置信度见框内标注）。" : "未检测到人脸，可换一张正脸、光线充足的图片。");
    } catch (e) {
      console.error(e);
      setStatus("检测过程出错：" + (e && e.message ? e.message : e), true);
    }
  }
  function processFile(file) {
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      detectAndDraw(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = function () { setStatus("图片读取失败，请重试。", true); };
    img.src = url;
  }
  function loadSample() {
    // 程序绘制示例人脸（避免外链图）
    var w = 480, h = 420;
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var octx = off.getContext("2d");
    octx.fillStyle = "#5b6b7d"; octx.fillRect(0, 0, w, h);
    octx.fillStyle = "#f0c9a0"; octx.beginPath(); octx.ellipse(w / 2, h * 0.45, 92, 120, 0, 0, Math.PI * 2); octx.fill();
    octx.fillStyle = "#1a1a1a";
    octx.beginPath(); octx.arc(w / 2 - 36, h * 0.44, 10, 0, Math.PI * 2); octx.arc(w / 2 + 36, h * 0.44, 10, 0, Math.PI * 2); octx.fill();
    octx.strokeStyle = "#8a4a2b"; octx.lineWidth = 3;
    octx.beginPath(); octx.arc(w / 2, h * 0.60, 18, 0.15 * Math.PI, 0.85 * Math.PI); octx.stroke();
    octx.strokeStyle = "#3a2c20"; octx.lineWidth = 2;
    octx.beginPath(); octx.moveTo(w / 2 - 60, h * 0.35); octx.quadraticCurveTo(w / 2 - 74, h * 0.28, w / 2 - 62, h * 0.20); octx.stroke();
    octx.beginPath(); octx.moveTo(w / 2 + 60, h * 0.35); octx.quadraticCurveTo(w / 2 + 74, h * 0.28, w / 2 + 62, h * 0.20); octx.stroke();
    octx.fillStyle = "#4a3628"; octx.fillRect(0, h * 0.78, w, h * 0.22);
    octx.fillStyle = "#274e6d"; octx.fillRect(w * 0.15, h * 0.72, w * 0.7, 26);
    var img = new Image();
    img.onload = function () { detectAndDraw(img); };
    img.src = off.toDataURL();
  }

  var fileInput = document.getElementById("fd-file");
  if (fileInput) fileInput.addEventListener("change", function (e) { processFile(e.target.files && e.target.files[0]); });
  document.getElementById("fd-sample").addEventListener("click", loadSample);
  document.getElementById("fd-status").textContent = "点击“使用示例图”或上传图片开始检测。";
})();
