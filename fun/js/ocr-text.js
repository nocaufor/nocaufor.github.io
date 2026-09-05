/* nocau fun P000034: OCR 图片文字识别（Tesseract.js v5，CDN，模型按需下载缓存） */
(function () {
  "use strict";
  var cv = document.getElementById("ocr-canvas");
  var outEl = document.getElementById("ocr-out");
  var statusEl = document.getElementById("ocr-status");
  var ctx = cv.getContext("2d");
  var busy = false;

  function setStatus(msg, err) {
    statusEl.textContent = msg;
    statusEl.style.color = err ? "#e06c75" : "var(--color-muted,#9aa3b2)";
  }
  function libReady() {
    return typeof window.Tesseract !== "undefined" && !!window.Tesseract.createWorker;
  }
  function drawImageToCanvas(img) {
    var scale = Math.min(900 / img.naturalWidth, 560 / img.naturalHeight, 1);
    var w = Math.max(80, Math.round(img.naturalWidth * scale));
    var h = Math.max(80, Math.round(img.naturalHeight * scale));
    cv.width = w; cv.height = h;
    ctx.fillStyle = "#0d1117"; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return w >= 32 && h >= 32;
  }
  function drawSample() {
    var w = 640, h = 260;
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var g = off.getContext("2d");
    g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c2330"; g.font = "bold 44px Georgia, 'Times New Roman', serif";
    g.fillText("Hello NOCAU", 46, 96);
    g.font = "30px 'KaiTi','STKaiti','Microsoft YaHei',sans-serif";
    g.fillText("把想法沉淀为代码", 46, 170);
    g.font = "20px monospace"; g.fillStyle = "#3d5a80";
    g.fillText("Tesseract.js OCR demo 2026", 46, 224);
    var img = new Image();
    img.onload = function () {
      drawImageToCanvas(img);
      runOcr();
    };
    img.src = off.toDataURL("image/png");
  }
  async function runOcr() {
    if (busy) return;
    if (!libReady()) {
      setStatus("Tesseract.js 加载失败：离线或 CDN 不可用，请联网后刷新。", true);
      outEl.textContent = "（需联网：模型与库均来自 cdn.jsdelivr.net）";
      return;
    }
    busy = true;
    var lang = document.getElementById("ocr-lang").value || "eng";
    var worker = null;
    outEl.textContent = "";
    try {
      worker = await window.Tesseract.createWorker(lang, 1, {
        logger: function (m) {
          if (m && typeof m.progress === "number") {
            var pct = Math.round(m.progress * 100);
            setStatus("识别中：模型 " + (m.status || "") + " " + pct + "%（首次使用会下载模型，稍候）");
          }
        }
      });
      setStatus("正在识别文字…");
      var res = await worker.recognize(cv);
      var text = (res && res.data && res.data.text) ? res.data.text.trim() : "";
      if (text) {
        outEl.textContent = text;
        setStatus("识别完成，共 " + text.length + " 字。");
      } else {
        outEl.textContent = "（未识别到文字）";
        setStatus("未识别到文字，换一张文字更清晰的图片试试。");
      }
    } catch (e) {
      console.error(e);
      outEl.textContent = "识别失败，请检查网络后重试。";
      setStatus("识别出错：" + (e && e.message ? e.message : e), true);
    } finally {
      if (worker) {
        try { await worker.terminate(); } catch (e) {}
      }
      busy = false;
    }
  }
  function handleFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var ok = drawImageToCanvas(img);
      URL.revokeObjectURL(url);
      if (!ok) { setStatus("图片过小，请选择更大的图片。", true); return; }
      runOcr();
    };
    img.onerror = function () { setStatus("图片读取失败，请重试。", true); };
    img.src = url;
  }
  var input = document.getElementById("ocr-file");
  if (input) input.addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); });
  document.getElementById("ocr-sample").addEventListener("click", drawSample);
  if (!libReady()) {
    setStatus("Tesseract.js 加载失败：离线或 CDN 不可用，请联网后刷新。", true);
  } else {
    setStatus("Tesseract.js 就绪。首次识别会自动下载模型（10~15MB）。");
  }
})();
