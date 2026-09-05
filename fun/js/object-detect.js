/* nocau fun: 目标检测（TensorFlow.js + COCO-SSD，浏览器本地推理） */
(function () {
  var cv = document.getElementById("od-canvas");
  var statusEl = document.getElementById("od-status");
  var ctx = cv.getContext("2d");
  var threshold = 0.5;
  var modelPromise = null;
  var modelReady = false;

  function setStatus(msg, err) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = "od-status" + (err ? " od-err" : "");
  }
  function readyLib() {
    return typeof window.tf !== "undefined" && typeof window.cocoSsd !== "undefined";
  }
  function loadModel() {
    if (modelReady) return Promise.resolve();
    if (modelPromise) return modelPromise;
    setStatus("加载 COCO-SSD 模型（首次约 4~6MB）…");
    modelPromise = window.cocoSsd.load()
      .then(function (m) { modelReady = true; setStatus("模型已就绪，可开始检测。"); return m; })
      .catch(function (e) { console.error(e); setStatus("模型加载失败：请检查网络后刷新重试（需访问 cdn.jsdelivr.net）。", true); throw e; });
    return modelPromise;
  }
  function drawImageScaled(img) {
    var scale = Math.min(720 / img.naturalWidth, 480 / img.naturalHeight, 1);
    var w = Math.max(1, Math.round(img.naturalWidth * scale));
    var h = Math.max(1, Math.round(img.naturalHeight * scale));
    cv.width = w; cv.height = h;
    ctx.fillStyle = "#0c0f14"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return { w: w, h: h };
  }
  async function detect(img) {
    if (!readyLib()) { setStatus("TensorFlow.js 库未加载（CDN 不可用或离线）。", true); return; }
    var size = drawImageScaled(img);
    try {
      var model = await loadModel();
      setStatus("推理中…");
      var predictions = await model.detect(img);
      predictions = predictions.filter(function (p) { return p.score >= threshold; });
      var color = "#5cc8ff";
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      for (var i = 0; i < predictions.length; i++) {
        var p = predictions[i];
        var x = p.bbox[0], y = p.bbox[1], w = p.bbox[2], h = p.bbox[3];
        ctx.strokeRect(x, y, w, h);
        var label = p.class + " " + (p.score * 100).toFixed(1) + "%";
        ctx.font = "12px sans-serif";
        var tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = "rgba(8,24,36,0.8)";
        ctx.fillRect(x, y > 18 ? y - 18 : y, tw, 18);
        ctx.fillStyle = color;
        ctx.fillText(label, x + 4, (y > 18 ? y - 6 : y + 14));
      }
      setStatus(predictions.length ? "检测到 " + predictions.length + " 个目标（标注见框内）。" : "未检测到置信度 ≥" + threshold + " 的目标，换一张主体清晰的图片试试。");
    } catch (e) {
      console.error(e);
      setStatus("检测过程出错：" + (e && e.message ? e.message : e), true);
    }
  }
  function processFile(file) {
    if (!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { detect(img); URL.revokeObjectURL(url); };
    img.onerror = function () { setStatus("图片读取失败，请重试。", true); };
    img.src = url;
  }
  function loadSample() {
    // 本地程序绘制示例图：包含可被 COCO 识别的"人形/猫"效果有限，
    // 因此绘制常见物体：书本(book)近似为矩形书本 / 水果碗不适用，故绘制一台"键盘/显示器"房间场景帮助演示
    var w = 640, h = 440;
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var g = off.getContext("2d");
    g.fillStyle = "#3d4653"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#59646f"; g.fillRect(0, h - 90, w, 90); // 桌面
    g.fillStyle = "#11141a"; g.fillRect(90, 120, 300, 180); // 显示器
    g.fillStyle = "#0a0d12"; g.fillRect(105, 135, 270, 150);
    g.fillStyle = "#20242c"; g.fillRect(60, 300, 380, 16); // 键盘条
    g.fillStyle = "#c9d2db"; g.fillRect(470, 300, 80, 80); // 书本（盒状）
    g.fillStyle = "#8b9bab"; g.fillRect(430, 300, 40, 80);
    g.fillStyle = "#d66f6f"; g.beginPath(); g.arc(180, 250, 14, 0, Math.PI * 2); g.fill(); // 小物体点
    var img = new Image();
    img.onload = function () { detect(img); };
    img.src = off.toDataURL();
  }

  var fileInput = document.getElementById("od-file");
  if (fileInput) fileInput.addEventListener("change", function (e) { processFile(e.target.files && e.target.files[0]); });
  document.getElementById("od-sample").addEventListener("click", loadSample);
  document.getElementById("od-threshold").addEventListener("input", function (e) { threshold = parseFloat(e.target.value); });
  setStatus("模型未加载。点击“使用示例图”或上传图片后将自动下载模型并检测。");
})();
