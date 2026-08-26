/* 圣诞树：Canvas 绘制 + 三套装饰风格（经典翠绿 / 雪白冰晶 / 金色华彩）+ 彩灯 / 雪花 / 礼物 */
(function () {
  "use strict";
  var canvas = document.getElementById("tree-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var note = document.getElementById("tree-note");
  var activeStyle = "classic";
  var lightsOn = false;
  var snowing = false;
  var snowflakes = [];
  var gifts = [];
  var twinkle = 0;

  var STYLES = {
    classic: {
      tree: ["#2f8f5b", "#3aa56a", "#46bd7b"],
      trunk: "#7a4a2b",
      star: "#ffd166",
      ball: ["#e05252", "#e6b84c", "#5a8fd6", "#e0708a", "#f2f2f2"],
      light: ["#ffd166", "#ff8f8f", "#8fd6ff", "#c3a6ff"],
      ground: "rgba(40,60,45,0.9)"
    },
    frost: {
      tree: ["#a8d8ec", "#c2e4f4", "#dff1fa"],
      trunk: "#5a6a78",
      star: "#eaf7ff",
      ball: ["#9fd8f5", "#eaf7ff", "#b8a6e8", "#f5d0e8", "#ffffff"],
      light: ["#eaf7ff", "#bfe0ff", "#d8c6ff", "#fff0c9"],
      ground: "rgba(90,110,130,0.9)"
    },
    gold: {
      tree: ["#8a6a1f", "#a9852b", "#c9a53d"],
      trunk: "#6d4a20",
      star: "#fff2b0",
      ball: ["#e6b84c", "#fff2b0", "#d98e4a", "#f5e0a3", "#e8c8ff"],
      light: ["#fff2b0", "#ffcf6b", "#ff9e6b", "#f0e0b0"],
      ground: "rgba(90,70,30,0.9)"
    }
  };

  function resize() {
    var cssW = canvas.getBoundingClientRect().width || 760;
    canvas.width = cssW * 2;
    canvas.height = 620 * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
  }
  resize();
  window.addEventListener("resize", function () { resize(); draw(); });

  function makeSnow(n) {
    snowflakes = [];
    for (var i = 0; i < n; i++) {
      snowflakes.push({ x: Math.random() * 760, y: Math.random() * 620, r: 1 + Math.random() * 2.6, vy: 0.4 + Math.random() * 1.1, vx: (Math.random() - 0.5) * 0.6 });
    }
  }

  function makeGifts() {
    gifts = [];
    var colors = STYLES[activeStyle].ball;
    for (var i = 0; i < 4; i++) {
      gifts.push({ x: 210 + i * 110 + (Math.random() - 0.5) * 26, y: 512 + (Math.random() - 0.5) * 10, w: 38 + Math.random() * 16, h: 22 + Math.random() * 8, c: colors[(Math.random() * colors.length) | 0] });
    }
  }

  function drawTree(style) {
    var s = STYLES[style];
    var cx = 380, baseY = 500;
    /* 树干 */
    ctx.fillStyle = s.trunk;
    ctx.fillRect(cx - 22, baseY - 46, 44, 52);
    /* 三层树冠：从下往上 */
    var layers = [
      { w: 300, y: baseY - 40 },
      { w: 232, y: baseY - 118 },
      { w: 162, y: baseY - 192 }
    ];
    for (var i = 0; i < layers.length; i++) {
      ctx.fillStyle = s.tree[i % s.tree.length];
      ctx.beginPath();
      ctx.moveTo(cx, layers[i].y - 84);
      ctx.lineTo(cx - layers[i].w / 2, layers[i].y);
      ctx.lineTo(cx + layers[i].w / 2, layers[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    /* 星星 */
    ctx.save();
    ctx.translate(cx, layers[2].y - 96);
    ctx.rotate(Math.PI / 2 + Math.sin(twinkle / 22) * 0.06);
    ctx.fillStyle = s.star;
    ctx.beginPath();
    for (var k = 0; k < 10; k++) {
      var rad = k % 2 === 0 ? 18 : 8;
      var ang = (Math.PI / 5) * k - Math.PI / 2;
      ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    /* 装饰球 */
    var balls = [
      [cx - 70, baseY - 30, 9], [cx + 66, baseY - 44, 8], [cx - 18, baseY - 60, 8],
      [cx + 34, baseY - 92, 9], [cx - 52, baseY - 112, 7], [cx + 8, baseY - 142, 8],
      [cx - 28, baseY - 176, 7], [cx + 30, baseY - 196, 6], [cx - 6, baseY - 214, 6]
    ];
    for (var b = 0; b < balls.length; b++) {
      ctx.fillStyle = s.ball[b % s.ball.length];
      ctx.beginPath();
      ctx.arc(balls[b][0], balls[b][1], balls[b][2], 0, Math.PI * 2);
      ctx.fill();
    }
    /* 彩灯 */
    if (lightsOn) {
      var lamps = [
        [cx - 96, baseY - 26, 0], [cx + 90, baseY - 30, 1], [cx - 44, baseY - 84, 2],
        [cx + 60, baseY - 128, 3], [cx - 78, baseY - 152, 1], [cx + 16, baseY - 178, 2],
        [cx - 34, baseY - 212, 3], [cx + 52, baseY - 222, 0]
      ];
      for (var l = 0; l < lamps.length; l++) {
        var li = s.light[lamps[l][2] % s.light.length];
        ctx.fillStyle = li;
        ctx.shadowColor = li;
        ctx.shadowBlur = 10 + Math.sin(twinkle / 14 + l) * 5;
        ctx.beginPath();
        ctx.arc(lamps[l][0], lamps[l][1], 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    /* 礼物 */
    gifts.forEach(function (g) {
      ctx.fillStyle = g.c;
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x, g.y, g.w, g.h);
      ctx.beginPath();
      ctx.moveTo(g.x + g.w / 2, g.y);
      ctx.lineTo(g.x + g.w / 2, g.y + g.h);
      ctx.stroke();
    });
    /* 地面 */
    ctx.fillStyle = s.ground;
    ctx.fillRect(0, 532, 760, 88);
  }

  function draw() {
    ctx.clearRect(0, 0, 760, 620);
    twinkle++;
    drawTree(activeStyle);
    if (snowing) {
      ctx.fillStyle = "#ffffff";
      snowflakes.forEach(function (f) {
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
        f.y += f.vy;
        f.x += f.vx + Math.sin(twinkle / 40 + f.y / 30) * 0.3;
        if (f.y > 620) { f.y = -4; f.x = Math.random() * 760; }
      });
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(draw);
  }

  function setStyle(style) {
    activeStyle = style;
    makeGifts();
    var names = { classic: "经典翠绿", frost: "雪白冰晶", gold: "金色华彩" };
    if (note) note.textContent = "已切换装饰风格：" + names[style];
    var btns = document.getElementById("tree-picker");
    if (btns) Array.prototype.forEach.call(btns.querySelectorAll(".btn"), function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-style") === style);
    });
  }

  makeGifts();
  makeSnow(90);

  var lightBtn = document.getElementById("tree-lights");
  if (lightBtn) lightBtn.addEventListener("click", function () {
    lightsOn = !lightsOn;
    if (note) note.textContent = lightsOn ? "彩灯已点亮" : "彩灯已熄灭";
  });
  var snowBtn = document.getElementById("tree-snow");
  if (snowBtn) snowBtn.addEventListener("click", function () {
    snowing = !snowing;
    if (note) note.textContent = snowing ? "下雪啦，好美" : "雪停了";
  });
  var giftBtn = document.getElementById("tree-gifts");
  if (giftBtn) giftBtn.addEventListener("click", function () { makeGifts(); if (note) note.textContent = "圣诞礼物已放好"; });
  var picker = document.getElementById("tree-picker");
  if (picker) picker.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-style]") : null;
    if (b) setStyle(b.getAttribute("data-style"));
  });

  draw();
})();
