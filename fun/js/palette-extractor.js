/* nocau fun P000038: 调色板提取（K-Means 主色 + 点击取色，本地算法） */
(function () {
  "use strict";
  var cv = document.getElementById("pl-canvas");
  var ctx = cv.getContext("2d", { willReadFrequently: true });
  var sw = document.getElementById("pl-swatches");
  var pickEl = document.getElementById("pl-pick");
  var tipEl = document.getElementById("pl-tip");
  var stage = document.getElementById("pl-stage");

  function hex(v) {
    var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return s.length < 2 ? "0" + s : s;
  }
  function hexColor(r, g, b) { return "#" + hex(r) + hex(g) + hex(b); }
  function pickColor(e) {
    var rect = cv.getBoundingClientRect();
    var x = Math.floor((e.clientX - rect.left) / rect.width * cv.width);
    var y = Math.floor((e.clientY - rect.top) / rect.height * cv.height);
    x = Math.max(0, Math.min(cv.width - 1, x)); y = Math.max(0, Math.min(cv.height - 1, y));
    var d = ctx.getImageData(x, y, 1, 1).data;
    var c = hexColor(d[0], d[1], d[2]);
    pickEl.textContent = "取色 (x" + x + ", y" + y + ")：" + c.toUpperCase() + "  |  rgb(" + d[0] + ", " + d[1] + ", " + d[2] + ") —— 点击色块可复制";
    copyText(c.toUpperCase() + " rgb(" + d[0] + ", " + d[1] + ", " + d[2] + ")");
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () {});
    }
  }
  function kmeans(pixels, k, maxIter) {
    var points = [];
    for (var i = 0; i < pixels.length; i += 4) {
      var a = pixels[i + 3] / 255;
      if (a < 0.4) continue;
      points.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
    if (!points.length) return [];
    var stride = Math.max(1, Math.floor(points.length / 2000));
    var sample = [];
    for (var s = 0; s < points.length; s += stride) sample.push(points[s]);
    var cdata = sample.slice(0, k);
    if (cdata.length < k) return points.slice(0, k);
    for (var it = 0; it < (maxIter || 10); it++) {
      var sums = [], counts = [];
      for (var ci = 0; ci < k; ci++) { sums.push([0, 0, 0]); counts.push(0); }
      for (var pi = 0; pi < sample.length; pi++) {
        var p = sample[pi], best = 0, bd = 1e18;
        for (var j = 0; j < k; j++) {
          var d = (p[0] - cdata[j][0]) * (p[0] - cdata[j][0]) + (p[1] - cdata[j][1]) * (p[1] - cdata[j][1]) + (p[2] - cdata[j][2]) * (p[2] - cdata[j][2]);
          if (d < bd) { bd = d; best = j; }
        }
        sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2]; counts[best]++;
      }
      var moved = false;
      for (var j2 = 0; j2 < k; j2++) {
        if (!counts[j2]) continue;
        var nc = [sums[j2][0] / counts[j2], sums[j2][1] / counts[j2], sums[j2][2] / counts[j2]];
        if (Math.abs(nc[0] - cdata[j2][0]) + Math.abs(nc[1] - cdata[j2][1]) + Math.abs(nc[2] - cdata[j2][2]) > 0.5) moved = true;
        cdata[j2] = nc;
      }
      if (!moved) break;
    }
    cdata.sort(function (a, b) { return (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11) - (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11); });
    return cdata;
  }
  function render() {
    var d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    var cols = kmeans(d, 6, 9);
    sw.innerHTML = "";
    for (var i = 0; i < cols.length; i++) {
      (function (rgb) {
        var c = hexColor(rgb[0], rgb[1], rgb[2]);
        var div = document.createElement("div");
        div.className = "pl-swatch";
        div.innerHTML = '<div class="fill" style="background:' + c + '"></div><div class="meta">' + c.toUpperCase() + "<br>rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")</div>";
        div.addEventListener("click", function () { copyText(c.toUpperCase()); pickEl.textContent = "已复制 " + c.toUpperCase(); });
        sw.appendChild(div);
      })(cols[i]);
    }
  }
  function loadImg(img) {
    var scale = Math.min(720 / img.naturalWidth, 500 / img.naturalHeight, 1);
    var w = Math.max(80, Math.round(img.naturalWidth * scale));
    var h = Math.max(80, Math.round(img.naturalHeight * scale));
    cv.width = w; cv.height = h;
    ctx.drawImage(img, 0, 0, w, h);
    render();
  }
  function handleFile(file) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () { loadImg(img); URL.revokeObjectURL(url); };
    img.onerror = function () { pickEl.textContent = "图片读取失败。"; };
    img.src = url;
  }
  function sample() {
    var off = document.createElement("canvas"); off.width = 600; off.height = 360;
    var g = off.getContext("2d");
    var stops = ["#ff6b6b", "#ffa94d", "#ffe066", "#69db7c", "#66d9e8", "#748ffc", "#b197fc", "#f783ac"];
    var grad = g.createLinearGradient(0, 0, 600, 0);
    for (var i = 0; i < stops.length; i++) grad.addColorStop(i / (stops.length - 1), stops[i]);
    g.fillStyle = grad; g.fillRect(0, 0, 600, 360);
    g.fillStyle = "#18202e"; g.beginPath(); g.arc(300, 180, 90, 0, Math.PI * 2); g.fill();
    var img = new Image();
    img.onload = function () { loadImg(img); };
    img.src = off.toDataURL("image/png");
  }
  stage.addEventListener("mousemove", function (e) {
    var rect = cv.getBoundingClientRect();
    var x = Math.floor((e.clientX - rect.left) / rect.width * cv.width);
    var y = Math.floor((e.clientY - rect.top) / rect.height * cv.height);
    if (x >= 0 && y >= 0 && x < cv.width && y < cv.height) {
      var d = ctx.getImageData(x, y, 1, 1).data;
      tipEl.style.display = "block";
      tipEl.style.left = (e.clientX - rect.left + 14) + "px";
      tipEl.style.top = (e.clientY - rect.top - 10) + "px";
      tipEl.textContent = hexColor(d[0], d[1], d[2]).toUpperCase();
    }
  });
  stage.addEventListener("mouseleave", function () { tipEl.style.display = "none"; });
  stage.addEventListener("click", pickColor);
  document.getElementById("pl-file").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (f) handleFile(f); });
  document.getElementById("pl-sample").addEventListener("click", sample);
  sample();
})();
