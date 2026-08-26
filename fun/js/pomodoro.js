/* nocau Fun Pomodoro 计时器：专注/休息循环（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var clockEl = document.getElementById("pm-clock");
  var modeEl = document.getElementById("pm-mode");
  var fgEl = document.getElementById("pm-fg");
  var startBtn = document.getElementById("pm-start");
  var resetBtn = document.getElementById("pm-reset");
  var skipBtn = document.getElementById("pm-skip");
  var focusEl = document.getElementById("pm-focus");
  var breakEl = document.getElementById("pm-break");
  var statEl = document.getElementById("pm-stat");
  if (!clockEl) return;

  var CIRC = 2 * Math.PI * 100;
  var state = { mode: "focus", remaining: 25 * 60, running: false, focusDone: 0, round: 1 };
  var timer = null;

  function getFocusSec() { return Math.max(1, parseInt(focusEl.value, 10) || 25) * 60; }
  function getBreakSec() { return Math.max(1, parseInt(breakEl.value, 10) || 5) * 60; }

  function totalSec() {
    return state.mode === "focus" ? getFocusSec() : getBreakSec();
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return ("0" + m).slice(-2) + ":" + ("0" + s).slice(-2);
  }

  function render() {
    clockEl.textContent = fmt(state.remaining);
    modeEl.textContent = state.mode === "focus" ? "专注" : "休息";
    var total = totalSec();
    var ratio = total > 0 ? state.remaining / total : 0;
    fgEl.style.strokeDasharray = CIRC + " " + CIRC;
    fgEl.style.strokeDashoffset = CIRC * (1 - ratio);
    fgEl.setAttribute("stroke", state.mode === "focus" ? "#7aa2f7" : "#98c379");
    statEl.textContent = "本轮第 " + state.round + " 个专注 · 今日完成 " + state.focusDone + " 轮";
    startBtn.textContent = state.running ? "暂停" : (state.remaining < totalSec() ? "继续" : "开始");
  }

  function tick() {
    if (!state.running) return;
    state.remaining--;
    if (state.remaining <= 0) {
      if (state.mode === "focus") {
        state.focusDone++;
        state.mode = "break";
        state.remaining = getBreakSec();
        try { localStorage.setItem("ncPomodoroDone", String(state.focusDone)); } catch (e) {}
      } else {
        state.round++;
        state.mode = "focus";
        state.remaining = getFocusSec();
      }
    }
    render();
    // 播放提示音（WebAudio 蜂鸣，无外部资源）
    beep();
  }

  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  function start() {
    if (state.running) {
      state.running = false;
      clearInterval(timer);
    } else {
      state.running = true;
      timer = setInterval(tick, 1000);
    }
    render();
  }

  function reset() {
    state.running = false;
    clearInterval(timer);
    state.mode = "focus";
    state.remaining = getFocusSec();
    render();
  }

  function skip() {
    state.running = false;
    clearInterval(timer);
    if (state.mode === "focus") {
      state.focusDone++;
      state.mode = "break";
      state.remaining = getBreakSec();
    } else {
      state.round++;
      state.mode = "focus";
      state.remaining = getFocusSec();
    }
    render();
  }

  try { state.focusDone = parseInt(localStorage.getItem("ncPomodoroDone") || "0", 10) || 0; } catch (e) {}

  startBtn.addEventListener("click", start);
  resetBtn.addEventListener("click", reset);
  skipBtn.addEventListener("click", skip);
  focusEl.addEventListener("change", function () { if (!state.running && state.mode === "focus") state.remaining = getFocusSec(); render(); });
  breakEl.addEventListener("change", function () { if (!state.running && state.mode === "break") state.remaining = getBreakSec(); render(); });

  render();
})();
