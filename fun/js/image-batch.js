/* 图片批处理：页面在线演示逻辑
   Canvas 缩放 / 灰度 / 格式转换 + 体积统计 + 逐张下载，全程本地，不上传任何文件 */
(function () {
  "use strict";

  var ITEMS = [];

  function $(id) { return document.getElementById(id); }

  function fmtSize(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }

  function extOf(mime) {
    return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" })[mime] || "png";
  }

  function pickMime(srcType) {
    var v = $("ib-fmt").value;
    if (v === "keep") return srcType === "image/gif" ? "image/png" : srcType;
    return v;
  }

  /* ---- 编码：优先 canvas.toBlob，失败或返回 null 时用 dataURL 兜底 ---- */
  function dataURLToBlob(url) {
    var comma = url.indexOf(","), meta = url.slice(5, comma), body = url.slice(comma + 1);
    var mime = meta.split(";")[0] || "image/png", bin = atob(body);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function encodeBlob(canvas, mime, q) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (b) {
          if (b) return resolve(b);
          try { resolve(dataURLToBlob(canvas.toDataURL(mime, q))); } catch (e) { reject(e); }
        }, mime, q);
      } catch (e) {
        try { resolve(dataURLToBlob(canvas.toDataURL(mime, q))); } catch (e2) { reject(e2); }
      }
    });
  }

  function loadImg(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        resolve({ name: file.name, src: img, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height,
                  inSize: file.size, srcType: file.type || "image/png" });
      };
      img.onerror = function () { resolve(null); };
      img.src = url;
    });
  }

  function targetSize(w, h) {
    var tw = parseInt($("ib-w").value, 10) || 0, th = parseInt($("ib-h").value, 10) || 0;
    if (!tw && !th) return { w: w, h: h };
    if (tw && !th) return { w: tw, h: Math.max(1, Math.round(h * tw / w)) };
    if (!tw && th) return { w: Math.max(1, Math.round(w * th / h)), h: th };
    return { w: tw, h: th };
  }

  function processOne(item) {
    var mime = pickMime(item.srcType);
    var size = targetSize(item.w, item.h);
    var canvas = document.createElement("canvas");
    canvas.width = size.w; canvas.height = size.h;
    var ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size.w, size.h); }
    ctx.filter = $("ib-gray").checked ? "grayscale(1)" : "none";
    ctx.drawImage(item.src, 0, 0, size.w, size.h);
    var q = Math.min(1, Math.max(0.4, (parseInt($("ib-q").value, 10) || 82) / 100));
    return encodeBlob(canvas, mime, q).then(function (blob) {
      item.outUrl = URL.createObjectURL(blob);
      item.outSize = blob.size; item.outW = size.w; item.outH = size.h;
      item.outName = item.name.replace(/\.[^.]+$/, "") + "." + extOf(mime);
      item.outMime = mime;
      item.ok = true;
      return item;
    });
  }

  function render() {
    var done = ITEMS.filter(function (i) { return i.ok; });
    var inSum = done.reduce(function (s, i) { return s + i.inSize; }, 0);
    var outSum = done.reduce(function (s, i) { return s + i.outSize; }, 0);
    $("ib-k-count").textContent = done.length;
    $("ib-k-in").textContent = fmtSize(inSum);
    $("ib-k-out").textContent = fmtSize(outSum);
    $("ib-k-save").textContent = (inSum ? ((outSum - inSum) / inSum * 100).toFixed(1) : "0.0") + "%";

    $("ib-out").innerHTML = done.length
      ? '<div class="ib-grid">' + done.map(function (i) {
          return '<figure class="ib-cell"><img src="' + i.outUrl + '" alt="' + i.outName + '" />' +
            '<figcaption>' + i.outW + "×" + i.outH + " · " + fmtSize(i.outSize) +
            ' <a href="' + i.outUrl + '" download="' + i.outName + '">下载</a></figcaption></figure>';
        }).join("") + "</div>"
      : "";

    $("ib-tblwrap").style.display = done.length ? "" : "none";
    $("ib-tblwrap").innerHTML = done.length
      ? '<div class="code-card"><p>逐张明细（输入 → 输出）：</p><table class="demo-table" id="ib-tbl"><thead><tr>' +
        "<th>文件</th><th>原始尺寸</th><th>输出尺寸</th><th>原始大小</th><th>输出大小</th><th>格式</th></tr></thead><tbody>" +
        done.map(function (i) {
          var delta = i.inSize ? ((i.outSize - i.inSize) / i.inSize * 100) : 0;
          return "<tr><td>" + i.name + "</td><td>" + i.w + "×" + i.h + "</td><td>" + i.outW + "×" + i.outH +
            "</td><td>" + fmtSize(i.inSize) + "</td><td>" + fmtSize(i.outSize) +
            '</td><td>' + extOf(i.outMime) + (delta < 0 ? "（省 " + Math.abs(delta).toFixed(1) + "%）" : "") + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : "";
  }

  function run() {
    if (!ITEMS.length) {
      $("ib-status").textContent = "还没有可处理的图片：请点“生成示例图片”，或选择本地图片文件。";
      return Promise.resolve();
    }
    $("ib-status").textContent = "处理中……";
    ITEMS.forEach(function (i) { i.ok = false; });
    var chain = Promise.resolve();
    ITEMS.forEach(function (item) {
      chain = chain.then(function () {
        return processOne(item).catch(function (e) { item.err = e.message || "处理失败"; });
      });
    });
    return chain.then(function () {
      render();
      var okCount = ITEMS.filter(function (i) { return i.ok; }).length;
      var bad = ITEMS.filter(function (i) { return i.err; });
      $("ib-status").textContent = "已完成 " + okCount + " / " + ITEMS.length + " 张（目标宽 " +
        ($("ib-w").value || 0) + "px" + ($("ib-gray").checked ? "，转灰度" : "") + "，输出 " +
        $("ib-fmt").options[$("ib-fmt").selectedIndex].text + "）。" + (bad.length ? " 失败 " + bad.length + " 张。" : "");
    });
  }

  /* 示例图：浏览器现场绘制（不读磁盘），作为处理源直接进管线，避免解码差异 */
  function makeSamples() {
    var schemes = [["#1f6feb", "#7ee787"], ["#f778ba", "#ffd166"], ["#8b5cf6", "#22d3ee"]];
    return schemes.map(function (c, idx) {
      var cv = document.createElement("canvas");
      cv.width = 900; cv.height = 600;
      var ctx = cv.getContext("2d");
      var g = ctx.createLinearGradient(0, 0, 900, 600);
      g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 600);
      ctx.globalAlpha = 0.85; ctx.fillStyle = "#ffffff";
      for (var i = 0; i < 12; i++) {
        ctx.beginPath(); ctx.arc(90 + i * 66, 300 + Math.sin(i) * 120, 26, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = "#0b1021";
      ctx.font = "bold 56px system-ui, sans-serif";
      ctx.fillText("sample-" + (idx + 1), 40, 540);
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText("900 × 600 测试图 · 用于演示批处理", 40, 580);
      var dataUrl = cv.toDataURL("image/png");                   // 用于估算"原图"字节数（PNG 编码后大小）
      return { name: "sample-" + (idx + 1) + ".png", src: cv, w: cv.width, h: cv.height,
               inSize: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 3 / 4), srcType: "image/png" };
    });
  }

  function loadSamples() {
    ITEMS = makeSamples();
    return run().then(function () {
      $("ib-status").textContent += " 示例图为浏览器现场生成，可直接点“下载”核对输出效果。";
    });
  }

  function addFiles(files) {
    var arr = Array.prototype.slice.call(files);
    if (!arr.length) { $("ib-status").textContent = "没有选择文件。"; return Promise.resolve(); }
    return Promise.all(arr.map(loadImg)).then(function (list) {
      var good = list.filter(Boolean);
      ITEMS = good;
      if (!good.length) {
        $("ib-status").textContent = "所选文件都无法在浏览器中解码（支持 PNG / JPEG / WebP / GIF 等常见格式）。";
        return;
      }
      return run();
    });
  }

  function init() {
    if (!$("ib-run")) return;
    $("ib-run").addEventListener("click", run);
    $("ib-sample").addEventListener("click", loadSamples);
    $("ib-clear").addEventListener("click", function () {
      ITEMS = []; $("ib-files").value = ""; $("ib-out").innerHTML = "";
      $("ib-tblwrap").style.display = "none";
      $("ib-k-count").textContent = "0"; $("ib-k-in").textContent = "0 B";
      $("ib-k-out").textContent = "0 B"; $("ib-k-save").textContent = "0.0%";
      $("ib-status").textContent = "已清空：等待重新选择图片或生成示例图。";
    });
    $("ib-files").addEventListener("change", function () { addFiles($("ib-files").files); });
    loadSamples();                                                // 进页面即可直接体验完整流程
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
