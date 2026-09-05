/* nocau fun P000036: 摄像头运动检测（帧差法 + 局部阈值运动图 + 框选；演示模式离线可跑） */
(function () {
  "use strict";
  var cv = document.getElementById("md-canvas");
  var ctx = cv.getContext("2d", { willReadFrequently: true });
  var statusEl = document.getElementById("md-status");
  var cntEl = document.getElementById("md-cnt");
  var W = 640, H = 360;
  var stream = null, running = false, demoMode = false, raf = 0;
  var prevGray = null, prevTs = 0;
  var demoState = { balls: [], t: 0, t0: 0 };
  var lastFire = 0;

  function setStatus(m, err) { statusEl.textContent = m; statusEl.style.color = err ? "#e06c75" : "var(--color-muted,#9aa3b2)"; }
  function grayFrom(img) {
    var n = img.data.length, out = new Uint8Array(n / 4);
    for (var i = 0, j = 0; i < n; i += 4, j++) {
      out[j] = (img.data[i] * 299 + img.data[i + 1] * 587 + img.data[i + 2] * 114 + 500) / 1000;
    }
    return out;
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    demoMode = false;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#05070c"; ctx.fillRect(0, 0, W, H);
    prevGray = null;
    setStatus("已停止。");
  }
  function setLabel() {
    ctx.font = "12px sans-serif"; ctx.fillStyle = "#9aa3b2";
    ctx.textBaseline = "top"; ctx.fillText(demoMode ? "演示模式（程序生成运动小球）" : "摄像头画面", 10, 8);
  }
  function renderDemo(time) {
    if (!running) return;
    var t = (time - demoState.t0) / 1000;
    ctx.fillStyle = "#0a0e18"; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 5; i++) {
      var b = demoState.balls[i];
      var spd = 60 + (i % 3) * 42;
      b.x += b.vx * (1 / 60) * (spd / 60);
      b.y += b.vy * (1 / 60) * (spd / 60);
      if (b.x < b.r || b.x > W - b.r) b.vx *= -1;
      if (b.y < b.r || b.y > H - b.r) b.vy *= -1;
      b.x = Math.max(b.r, Math.min(W - b.r, b.x));
      b.y = Math.max(b.r, Math.min(H - b.r, b.y));
      ctx.fillStyle = "rgba(160,190,255,0.9)";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(160,190,255,0.28)";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2, 0, Math.PI * 2); ctx.fill();
    }
    setLabel();
    detectDiff();
    raf = requestAnimationFrame(renderDemo);
  }
  function startDemo() {
    stop();
    running = true; demoMode = true;
    demoState.balls = [];
    for (var i = 0; i < 5; i++) {
      demoState.balls.push({ x: 60 + Math.random() * (W - 120), y: 60 + Math.random() * (H - 120), r: 8 + Math.random() * 10, vx: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.4), vy: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.4) });
    }
    demoState.t0 = performance.now();
    setStatus("演示模式：画面中有程序生成的移动光球，可移动鼠标在页面其它区域感受灵敏度调节。");
    raf = requestAnimationFrame(renderDemo);
  }
  function startCam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("浏览器不支持摄像头，或需 https / localhost。可点击“演示模式”。", true); return;
    }
    stop();
    setStatus("请求摄像头权限…");
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 } }, audio: false })
      .then(function (s) {
        stream = s;
        running = true;
        var video = document.createElement("video");
        video.setAttribute("playsinline", "true");
        video.autoplay = true; video.muted = true;
        video.srcObject = s;
        video.onloadedmetadata = function () {
          video.play().catch(function () {});
          setStatus("运动检测已开启；在镜头前移动即可看到绿色框。");
          loopCam(video);
        };
        video.onerror = function () { stop(); setStatus("视频流异常，请重试。", true); };
      })
      .catch(function (e) { setStatus("摄像头不可用：" + (e && e.name ? e.name : e) + "。", true); });
  }
  function loopCam(video) {
    function tick(time) {
      if (!running) return;
      if (video.readyState >= 2 && video.videoWidth > 10) {
        ctx.drawImage(video, 0, 0, W, H);
        setLabel();
        detectDiff();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }
  function detectDiff() {
    var sens = parseFloat(document.getElementById("md-sens").value) || 26;
    var minArea = parseFloat(document.getElementById("md-area").value) || 0.01;
    var drawBox = document.getElementById("md-box").checked;
    var img = ctx.getImageData(0, 0, W, H);
    var gray = grayFrom(img);
    var bins = new Uint8Array(W * H);
    var w = W, h = H;
    var s2 = sens * sens;
    if (prevGray) {
      var minW = Math.floor(w * 0.15), minH = Math.floor(h * 0.15);
      for (var y = minH; y < h - minH; y++) {
        var row = y * w;
        for (var x = minW; x < w - minW; x++) {
          var d = gray[row + x] - prevGray[row + x];
          if (d * d > s2) bins[row + x] = 1;
        }
      }
      /* 中值-ish 噪声消除：去掉上下左右孤立点，减少闪烁 */
      var cleaned = new Uint8Array(bins);
      for (var yy = minH + 1; yy < h - minH - 1; yy++) {
        for (var xx = minW + 1; xx < w - minW - 1; xx++) {
          var idx = yy * w + xx;
          if (bins[idx] && !(bins[idx - 1] || bins[idx + 1] || bins[idx - w] || bins[idx + w])) cleaned[idx] = 0;
        }
      }
      var regions = findRegions(cleaned, minArea * w * h);
      cntEl.textContent = "运动区域：" + regions.length;
      if (drawBox) {
        ctx.strokeStyle = "rgba(110, 231, 160, 0.9)";
        ctx.lineWidth = 2;
        for (var r = 0; r < regions.length; r++) {
          ctx.strokeRect(regions[r].x, regions[r].y, regions[r].w, regions[r].h);
        }
      }
    }
    prevGray = gray;
    if (performance.now() - lastFire > 300) { lastFire = performance.now(); }
  }
  function findRegions(bin, minPx) {
    var w = W, h = H, visited = new Uint8Array(w * h), out = [];
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = y * w + x;
        if (!bin[i] || visited[i]) continue;
        var stack = [i], minX = x, maxX = x, minY = y, maxY = y, count = 0;
        visited[i] = 1;
        while (stack.length) {
          var ci = stack.pop();
          var cx = ci % w, cy = (ci / w) | 0;
          count++;
          if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
          var nb = [ci - 1, ci + 1, ci - w, ci + w];
          for (var k = 0; k < nb.length; k++) {
            var ni = nb[k];
            if (ni < 0 || ni >= w * h) continue;
            var nxx = ni % w, nyy = (ni / w) | 0;
            if (Math.abs(nxx - cx) > 1 || Math.abs(nyy - cy) > 1) continue;
            if (bin[ni] && !visited[ni]) { visited[ni] = 1; stack.push(ni); }
          }
        }
        if (count >= minPx) out.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      }
    }
    return out.slice(0, 8);
  }
  document.getElementById("md-cam").addEventListener("click", startCam);
  document.getElementById("md-demo").addEventListener("click", startDemo);
  document.getElementById("md-stop").addEventListener("click", stop);
  window.addEventListener("pagehide", stop);
})();
