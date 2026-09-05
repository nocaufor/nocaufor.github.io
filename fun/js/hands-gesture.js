/* nocau fun P000040: 手势识别（MediaPipe Hands + Camera Utils，CDN 加载；需联网） */
(function () {
  "use strict";
  var video = document.getElementById("hd-video");
  var canvas = document.getElementById("hd-canvas");
  var gctx = canvas.getContext("2d");
  var gestureEl = document.getElementById("hd-gesture");
  var statusEl = document.getElementById("hd-status");
  var hands = null, camera = null, running = false;

  function setStatus(m, err) { statusEl.textContent = m; statusEl.style.color = err ? "#e06c75" : "var(--color-muted,#9aa3b2)"; }
  function libReady() {
    return typeof window.Hands === "function" && typeof window.Camera === "function" && typeof window.drawConnectors === "function";
  }
  function countFingers(lm) {
    /* lm 为 21 点归一化坐标数组 {x,y}，阈值法判断抬指（拇指按 x，其余按指尖-指中节） */
    var up = 0;
    if (lm[4].x > lm[3].x + 0.02) up++;               /* 拇指（镜像简单近似） */
    if (lm[8].y < lm[6].y - 0.015) up++;
    if (lm[12].y < lm[10].y - 0.015) up++;
    if (lm[16].y < lm[14].y - 0.015) up++;
    if (lm[20].y < lm[18].y - 0.015) up++;
    return up;
  }
  function bestGesture(res) {
    if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) return "未检测到手掌";
    var lm = res.multiHandLandmarks[0];
    var up = countFingers(lm);
    /* 指间距离判断比耶/摇滚/OK 类特殊手势：拇指尖与食指尖距离很近时视为 OK 圈 */
    var dx = lm[8].x - lm[4].x, dy = lm[8].y - lm[4].y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (up === 2 && dist < 0.16) return "OK 手势（指尖相触）";
    if (up === 2) return "比耶（2 指）";
    if (up === 3 && lm[12].y < lm[8].y) return "三指";
    if (up === 1 && dist < 0.18) return "OK 手势（指尖相触）";
    if (up === 1) return "单指 / 点赞";
    if (up === 4) return "四指";
    if (up === 5) return "五指张开（5 指）";
    if (up === 0) return "握拳";
    return "手势：" + up + " 指";
  }
  function drawResult(res) {
    var w = video.videoWidth || canvas.width, h = video.videoHeight || canvas.height;
    canvas.width = w; canvas.height = h;
    gctx.clearRect(0, 0, w, h);
    if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) {
      gestureEl.textContent = "未检测到手掌";
      return;
    }
    var lm = res.multiHandLandmarks[0];
    drawConnectors(gctx, lm, HAND_CONNECTIONS, { color: "rgba(122,162,247,0.85)", lineWidth: 3 });
    drawLandmarks(gctx, lm, { color: "rgba(238,244,255,0.95)", lineWidth: 1, radius: 3 });
    gestureEl.textContent = bestGesture(res);
  }
  function setup() {
    if (!libReady()) {
      setStatus("MediaPipe 库加载失败：离线或 CDN 不可用，请联网后刷新重试。", true);
      gestureEl.textContent = "需联网";
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("当前浏览器不支持摄像头，或需在 https / localhost 下访问。", true);
      return;
    }
    setStatus("正在初始化 MediaPipe Hands（需联网下载模型，首次约 6MB）…");
    hands = new Hands({ locateFile: function (file) { return "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file; } });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5
    });
    hands.onResults(drawResult);
    camera = new Camera(video, {
      onFrame: function () {
        if (hands) { try { hands.send({ image: video }); } catch (e) {} }
      },
      width: 640, height: 480
    });
    camera.start().then(function () {
      running = true;
      gestureEl.textContent = "识别中";
      setStatus("运行中：举起手掌即可看到骨架与手势文字。");
    }).catch(function (e) {
      setStatus("摄像头启动失败：" + (e && e.message ? e.message : e) + "（需授权摄像头）。", true);
      gestureEl.textContent = "摄像头不可用";
    });
  }
  function stopAll() {
    running = false;
    if (camera) { try { camera.stop(); } catch (e) {} camera = null; }
    hands = null;
    gctx.clearRect(0, 0, canvas.width, canvas.height);
    gestureEl.textContent = "已停止";
    setStatus("已停止。可再次点击“开启手势识别”。");
  }
  document.getElementById("hd-start").addEventListener("click", function () { if (!running) setup(); });
  document.getElementById("hd-stop").addEventListener("click", stopAll);
  window.addEventListener("pagehide", function () { if (running) stopAll(); });
  if (!libReady()) {
    setStatus("MediaPipe 库加载失败：离线或 CDN 不可用，请联网后刷新重试。", true);
    gestureEl.textContent = "需联网";
  } else {
    setStatus("MediaPipe 已就绪（需联网）。点击“开启手势识别”并允许摄像头。");
  }
})();
