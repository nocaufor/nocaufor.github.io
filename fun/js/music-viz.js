/* music-viz：Web Audio 合成音 + 频谱/波形可视化（CSP 兼容，无内联） */
(function () {
  "use strict";
  var canvas = document.getElementById("mv-canvas");
  var ctx2d = canvas.getContext("2d");
  var playBtn = document.getElementById("mv-play");
  var modeBtn = document.getElementById("mv-mode");
  var statusEl = document.getElementById("mv-status");

  var actx = null;
  var analyser = null;
  var nodes = [];
  var playing = false;
  var mode = "freq";
  var raf = 0;
  var chord = [1, 1.25, 1.5, 2, 1.5, 1.25];
  var step = 0;

  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, Math.floor(r.width * dpr));
    canvas.height = 300 * dpr;
    canvas.style.height = "300px";
  }

  function start() {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      analyser.connect(actx.destination);
    }
    actx.resume();

    var gain = actx.createGain();
    gain.gain.value = 0.12;
    gain.connect(analyser);
    var osc = actx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 220;
    osc.connect(gain);
    osc.start();
    nodes.push(osc, gain);

    // 每 0.22s 切换琶音音符，制造旋律
    nodes.push(setInterval(function () {
      step = (step + 1) % chord.length;
      try { osc.frequency.setTargetAtTime(220 * chord[step], actx.currentTime, 0.03); } catch (e) {}
    }, 220));
    playing = true;
    playBtn.textContent = "■ 停止";
    statusEl.textContent = "正在播放合成琶音…";
    draw();
  }

  function stop() {
    nodes.forEach(function (n) {
      if (n && n.stop) { try { n.stop(); } catch (e) {} }
      if (n && clearInterval) { clearInterval(n); }
    });
    nodes = [];
    playing = false;
    playBtn.textContent = "▶ 播放演示音";
    statusEl.textContent = "已停止，点击播放重新开始。";
    cancelAnimationFrame(raf);
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    var W = canvas.width, H = canvas.height;
    var dpr = window.devicePixelRatio || 1;
    var data = new Uint8Array(analyser.frequencyBinCount);
    ctx2d.clearRect(0, 0, W, H);

    if (mode === "freq") {
      analyser.getByteFrequencyData(data);
      var bars = 64;
      var bw = W / bars;
      for (var i = 0; i < bars; i++) {
        var v = data[Math.floor(i * data.length / bars)] / 255;
        var h = v * (H * 0.86);
        var hue = 155 + i * 2.2;
        ctx2d.fillStyle = "hsla(" + hue + ", 70%, 62%, 0.9)";
        ctx2d.fillRect(i * bw + 1, H - h, bw - 2, h);
      }
      ctx2d.fillStyle = "rgba(255,255,255,0.16)";
      ctx2d.fillRect(0, H - 1, W, 1);
    } else {
      analyser.getByteTimeDomainData(data);
      ctx2d.beginPath();
      ctx2d.strokeStyle = "hsla(155, 70%, 62%, 0.95)";
      ctx2d.lineWidth = 2;
      for (var x = 0; x < W; x++) {
        var idx = Math.floor(x / W * data.length);
        var y = (data[idx] / 255) * H;
        if (x === 0) ctx2d.moveTo(x, y); else ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    }
    // 时间刻度
    ctx2d.fillStyle = "rgba(255,255,255,0.12)";
    for (var g = 0; g < W; g += 60 * dpr) {
      ctx2d.fillRect(g, 0, 1, H);
    }
  }

  playBtn.addEventListener("click", function () {
    if (playing) { stop(); return; }
    start();
  });

  modeBtn.addEventListener("click", function () {
    mode = mode === "freq" ? "wave" : "freq";
    modeBtn.textContent = mode === "freq" ? "切换：波形" : "切换：频谱";
  });

  window.addEventListener("resize", resize);
  resize();
})();
