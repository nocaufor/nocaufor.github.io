/* nocau · 色盲视觉模拟 — 标准视觉矩阵映射，零依赖纯本地实现 */
(function () {
  "use strict";

  var origCv = document.getElementById("cb-orig");
  var simCv = document.getElementById("cb-sim");
  if (!origCv || !simCv) return;
  var octx = origCv.getContext("2d");
  var sctx = simCv.getContext("2d");
  var fileEl = document.getElementById("cb-file");
  var sampleBtn = document.getElementById("cb-sample");
  var typeEl = document.getElementById("cb-type");
  var strengthEl = document.getElementById("cb-strength");
  var simLabel = document.getElementById("cb-simlabel");
  var statusEl = document.getElementById("cb-status");
  var W = origCv.width, H = origCv.height;
  var base = null;

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function drawSample() {
    octx.fillStyle = "#11151f";
    octx.fillRect(0, 0, W, H);
    // 双色条：红绿配与黄蓝配是色盲测试常见素材
    var colors = ["#d7263d", "#f46036", "#2e86ab", "#1b998b", "#ffd166", "#6a4c93", "#ff9f1c", "#3d405b"];
    var bw = W / colors.length;
    for (var i = 0; i < colors.length; i++) {
      octx.fillStyle = colors[i];
      octx.fillRect(i * bw, 0, bw + 1, H * 0.62);
    }
    octx.fillStyle = "#e9edf5";
    octx.font = "bold 64px sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText("RG", W * 0.36, H * 0.31);
    octx.fillText("BY", W * 0.7, H * 0.31);
    // 下方棋盘：区分红绿的小方块
    var sq = 26;
    var startY = H * 0.68;
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 14; col++) {
        octx.fillStyle = (row % 2 === col % 2) ? "#d1495b" : "#7d7a8c";
        octx.fillRect(30 + col * sq, startY + row * sq, sq, sq);
      }
    }
    for (var col2 = 0; col2 < 4; col2++) {
      octx.fillStyle = col2 < 2 ? "#d1495b" : "#7d7a8c";
      octx.fillRect(W - 40 - (3 - col2) * sq, startY + sq * 2, sq, sq);
    }
    octx.textBaseline = "alphabetic";
    base = octx.getImageData(0, 0, W, H);
    octx.putImageData(base, 0, 0);
    applyFilter();
    setStatus("示例图已载入，红绿 / 蓝黄对比一目了然");
  }

  function drawUploaded(img) {
    var scale = Math.min(W / img.width, H / img.height);
    var w = img.width * scale, h = img.height * scale;
    octx.fillStyle = "#0a0d12";
    octx.fillRect(0, 0, W, H);
    octx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    base = octx.getImageData(0, 0, W, H);
    applyFilter();
    setStatus("图片已载入，左右对照查看模拟结果");
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

  function getMatrix(type) {
    // 常用视觉模拟矩阵（RGB 输入 -> RGB 输出，接近视觉缺陷所见）
    if (type === "protan") {
      return [
        0.152286, 1.052583, -0.204868,
        0.114503, 0.786281, 0.099216,
        -0.003882, -0.048116, 1.051998
      ];
    }
    if (type === "tritan") {
      return [
        1.255528, -0.076749, -0.178779,
        -0.078411, 0.930809, 0.147602,
        0.004733, 0.691367, 0.303900
      ];
    }
    // 默认 Deutan
    return [
      0.367322, 0.860646, -0.227968,
      0.280085, 0.672501, 0.047413,
      -0.011820, 0.042940, 0.968881
    ];
  }

  function typeName(type) {
    if (type === "protan") return "红色盲模拟";
    if (type === "tritan") return "蓝黄色盲模拟";
    return "红绿色盲模拟";
  }

  function applyFilter() {
    if (!base) return;
    var type = typeEl.value;
    var strength = (parseInt(strengthEl.value, 10) || 100) / 100;
    if (simLabel) simLabel.textContent = typeName(type);
    var m = getMatrix(type);
    var data = base.data;
    var out = sctx.createImageData(W, H);
    var od = out.data;
    for (var i = 0, j = 0; i < data.length; i += 4, j += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var sr = m[0] * r + m[1] * g + m[2] * b;
      var sg = m[3] * r + m[4] * g + m[5] * b;
      var sb = m[6] * r + m[7] * g + m[8] * b;
      // 强度混合
      sr = r + (sr - r) * strength;
      sg = g + (sg - g) * strength;
      sb = b + (sb - b) * strength;
      od[j] = sr < 0 ? 0 : (sr > 255 ? 255 : sr);
      od[j + 1] = sg < 0 ? 0 : (sg > 255 ? 255 : sg);
      od[j + 2] = sb < 0 ? 0 : (sb > 255 ? 255 : sb);
      od[j + 3] = 255;
    }
    sctx.putImageData(out, 0, 0);
  }

  if (sampleBtn) sampleBtn.addEventListener("click", drawSample);
  if (fileEl) fileEl.addEventListener("change", function () {
    if (fileEl.files && fileEl.files[0]) loadFile(fileEl.files[0]);
    fileEl.value = "";
  });
  if (typeEl) typeEl.addEventListener("change", applyFilter);
  if (strengthEl) strengthEl.addEventListener("input", applyFilter);

  drawSample();
})();
