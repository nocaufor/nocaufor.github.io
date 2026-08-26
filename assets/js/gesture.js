/* ============================================================
   gesture.js — 视觉手势识别（Hero 背景粒子追踪）
   - 摄像头：navigator.mediaDevices.getUserMedia + MediaPipe Hands
   - 降级链：摄像头手势 → 鼠标/触摸追踪
   - HTTPS / localhost 才可请求摄像头；CSP 需放行 CDN 脚本
   - prefers-reduced-motion：整体停用
   ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;

  var stage = document.getElementById('gesture-stage');
  if (!stage) return;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  stage.appendChild(canvas);

  var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  var W = 0, H = 0;
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.floor(r.width));
    H = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  /* ---------------- 粒子系统 ---------------- */
  var particles = [];
  var MAX_P = 240;
  function spawn(x, y, vx, vy, spd) {
    particles.push({
      x: x, y: y,
      vx: (vx || 0) + (Math.random() - 0.5) * 1.1,
      vy: (vy || 0) + (Math.random() - 0.5) * 1.1,
      life: 1,
      decay: 0.016 + Math.random() * 0.022,
      size: 0.6 + Math.random() * 1.6 + Math.min(1.8, spd * 0.05),
      hue: Math.random() - 0.5
    });
    if (particles.length > MAX_P) particles.shift();
  }
  function pcolor(p) {
    var r = 205, g = 216, b = 235;
    if (p.hue > 0.12) { r = 238; g = 216; b = 178; }
    else if (p.hue < -0.12) { r = 176; g = 200; b = 236; }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, p.life).toFixed(3) + ')';
  }
  function step() {
    ctx.clearRect(0, 0, W, H);
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.984; p.vy *= 0.984;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.fillStyle = pcolor(p);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
      if (p.life > 0.45) {
        ctx.globalAlpha = Math.max(0, p.life - 0.45);
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 2.4, p.y - p.vy * 2.4, Math.max(0.2, p.size * p.life * 0.55), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }
  function loop() {
    step();
    requestAnimationFrame(loop);
  }

  /* ---------------- 输入源（指针/触摸） ---------------- */
  var mode = 'pointer';
  var lastX = -1, lastY = -1, lastT = 0;
  var lastEmit = 0;
  var IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  function track(x, y, now, vscale) {
    var spd = 0, dx = 0, dy = 0;
    if (lastT && now - lastT < 160) {
      dx = x - lastX; dy = y - lastY;
      spd = Math.sqrt(dx * dx + dy * dy);
    }
    if (now - lastEmit < 24) return;
    lastEmit = now;
    var n = 2 + Math.floor(Math.min(9, spd * 0.45));
    for (var i = 0; i < n; i++) {
      spawn(x + (Math.random() - 0.5) * 7, y + (Math.random() - 0.5) * 7,
        dx * 0.12 + (Math.random() - 0.5) * 2.2, dy * 0.12 + (Math.random() - 0.5) * 2.2, spd);
    }
    lastX = x; lastY = y; lastT = now;
  }
  function localXY(clientX, clientY) {
    var r = stage.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  document.addEventListener('mousemove', function (e) {
    var l = localXY(e.clientX, e.clientY);
    if (l.x < -20 || l.y < -20 || l.x > W + 20 || l.y > H + 20) return;
    track(l.x, l.y, performance.now(), 1);
    if (mode === 'hand') mode = 'pointer'; /* 鼠标出现时接管 */
  }, { passive: true });
  document.addEventListener('mousedown', function (e) {
    var l = localXY(e.clientX, e.clientY);
    if (l.x < 0 || l.y < 0 || l.x > W || l.y > H) return;
    for (var i = 0; i < 16; i++) spawn(l.x, l.y, (Math.random() - 0.5) * 3.6, (Math.random() - 0.5) * 3.6 - 0.7, 12);
  }, { passive: true });
  if (IS_TOUCH) {
    document.addEventListener('touchmove', function (e) {
      if (!e.touches.length) return;
      var l = localXY(e.touches[0].clientX, e.touches[0].clientY);
      if (l.x < 0 || l.y < 0 || l.x > W || l.y > H) return;
      track(l.x, l.y, performance.now(), 1);
    }, { passive: true });
    document.addEventListener('touchstart', function (e) {
      if (!e.touches.length) return;
      var l = localXY(e.touches[0].clientX, e.touches[0].clientY);
      if (l.x < 0 || l.y < 0 || l.x > W || l.y > H) return;
      for (var i = 0; i < 10; i++) spawn(l.x, l.y, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 9);
    }, { passive: true });
  }

  /* ---------------- 状态徽标 ---------------- */
  var statusEl = document.getElementById('gesture-status');
  var statusTextEl = document.getElementById('gesture-status-text');
  var zh = (document.documentElement.lang || 'zh').indexOf('zh') === 0;
  var T = {
    hand: zh ? '手势追踪' : 'Gesture track',
    pointer: zh ? '鼠标追踪' : 'Pointer track',
    tipHand: zh ? '点击切换为鼠标' : 'Click to switch to pointer',
    tipPointer: zh ? '点击开启摄像头' : 'Click to enable camera',
    busy: zh ? '启动中…' : 'Starting…',
    camOff: zh ? '摄像头已关闭' : 'Camera off'
  };
  function setStatus(m, key, tipKey) {
    if (!statusEl) return;
    statusEl.className = 'gesture-status ' + m;
    if (statusTextEl) statusTextEl.textContent = T[key] || '';
    var tip = statusEl.querySelector('.gesture-tip');
    if (tip) tip.textContent = T[tipKey] || '';
  }
  var camOn = false;
  if (statusEl) {
    statusEl.addEventListener('click', function () {
      if (camOn) {
        stopCamera();
        setStatus('off', 'camOff', 'tipPointer');
      } else if (mode === 'pointer') {
        tryCamera();
      }
    }, false);
  }

  /* ---------------- 摄像头手势识别（MediaPipe Hands） ---------------- */
  var hands = null, handStage = null, detRaf = null;
  var camStream = null;
  var camTried = false;

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }
  function secureCtx() {
    return (location.protocol === 'https:') || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '[::1]';
  }
  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('no-gum'));
    return navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
      audio: false
    }).then(function (stream) {
      camStream = stream;
      var video = document.createElement('video');
      video.width = 320; video.height = 240;
      video.autoplay = true; video.playsInline = true; video.muted = true;
      video.setAttribute('playsinline', '');
      video.srcObject = stream;
      video.style.display = 'none';
      document.body.appendChild(video);
      video.play().catch(function () {});
      return video;
    });
  }
  function initHands(video) {
    if (!window.Hands) return false;
    hands = new window.Hands({
      locateFile: function (file) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file; }
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    hands.onResults(function (res) {
      if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) return;
      var lm = res.multiHandLandmarks[0];
      var minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (var i = 0; i < lm.length; i++) {
        if (lm[i].x < minX) minX = lm[i].x;
        if (lm[i].x > maxX) maxX = lm[i].x;
        if (lm[i].y < minY) minY = lm[i].y;
        if (lm[i].y > maxY) maxY = lm[i].y;
      }
      var hw = Math.max(0.08, maxX - minX), hh = Math.max(0.08, maxY - minY);
      var r = stage.getBoundingClientRect();
      var x = ((lm[8].x - minX) / hw) * r.width;
      var y = ((lm[8].y - minY) / hh) * r.height;
      var now = performance.now();
      var spd = 0, dx = 0, dy = 0;
      if (lastT && now - lastT < 200) {
        dx = x - lastX; dy = y - lastY;
        spd = Math.sqrt(dx * dx + dy * dy);
      }
      if (now - lastEmit > 26) {
        lastEmit = now;
        var n = 2 + Math.floor(Math.min(10, spd * 0.5));
        for (var k = 0; k < n; k++) {
          spawn(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8,
            dx * 0.16 + (Math.random() - 0.5) * 2.4, dy * 0.16 + (Math.random() - 0.5) * 2.4, spd * 1.2);
        }
      }
      lastX = x; lastY = y; lastT = now;
      if (mode !== 'hand') { mode = 'hand'; setStatus('on', 'hand', 'tipHand'); }
    });
    handStage = video;
    detRaf = requestAnimationFrame(runDetect);
    camOn = true;
    return true;
  }
  function runDetect() {
    if (!camOn) return;
    if (hands && handStage && handStage.readyState >= 1 && handStage.videoWidth > 0) {
      hands.send({ image: handStage }).catch(function () {});
    }
    detRaf = requestAnimationFrame(runDetect);
  }
  function stopCamera() {
    camOn = false;
    if (detRaf) { cancelAnimationFrame(detRaf); detRaf = null; }
    if (hands) { try { hands.close(); } catch (e) {} hands = null; }
    if (camStream) {
      camStream.getTracks().forEach(function (tr) { tr.stop(); });
      camStream = null;
    }
    if (handStage) { handStage.srcObject = null; handStage = null; }
    mode = 'pointer';
    lastX = -1; lastY = -1; lastT = 0;
  }
  function tryCamera() {
    if (camTried || camOn) return;
    camTried = true;
    if (!secureCtx()) {
      setStatus('off', 'pointer', 'tipPointer');
      return;
    }
    setStatus('off', 'busy', 'tipPointer');
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.min.js').then(function (ok) {
      if (!ok) { setStatus('off', 'pointer', 'tipPointer'); return; }
      return startCamera();
    }).then(function (video) {
      if (!video) return;
      if (!initHands(video)) {
        stopCamera();
        setStatus('off', 'pointer', 'tipPointer');
      }
    }).catch(function () {
      stopCamera();
      setStatus('off', 'pointer', 'tipPointer');
    });
  }

  /* ---------------- 启动 ---------------- */
  resize();
  loop();
  /* 延迟请求摄像头，避免进入页面立即弹授权打扰浏览 */
  var camTimer = setTimeout(tryCamera, 3200);
  /* 页面不可见时暂停请求 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      clearTimeout(camTimer);
      if (camOn) stopCamera();
    }
  }, false);
})();
