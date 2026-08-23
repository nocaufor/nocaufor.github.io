/* ============================================================
   nocau.com — 主交互脚本（无依赖，原生 JS）
   功能：主题切换 / 汉堡导航 / 平滑滚动 / 滚动渐入 /
        粒子网络背景 / 打字机标题 / 数字统计 / 技能进度 /
        项目筛选 / 回到顶部 / 表单校验
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. 主题切换（默认深色，localStorage 记忆） ---------- */
  function initTheme() {
    var saved = localStorage.getItem("nocau-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (saved === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else if (saved === "dark" || !saved) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
    updateThemeIcon();
  }

  function initThemeToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    toggle.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("nocau-theme", next);
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    var isLight = document.documentElement.getAttribute("data-theme") === "light";
    toggle.textContent = isLight ? "🌙" : "☀️";
  }

  /* ---------- 2. 汉堡导航 ---------- */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      toggle.classList.toggle("open");
      links.classList.toggle("open");
    });

    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
      });
    });
  }

  /* ---------- 3. 当前导航高亮 ---------- */
  function initActiveNav() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(function (link) {
      if (link.getAttribute("href") === path) {
        link.classList.add("active");
      }
    });
  }

  /* ---------- 4. 滚动渐入动画 ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal, .reveal-left, .reveal-right");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 5. 粒子网络背景 ---------- */
  function initParticles() {
    var canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var ctx = canvas.getContext("2d");
    var particles = [];
    var mouse = { x: null, y: null };
    var running = true;

    var COLORS = ["0,229,255", "139,92,246", "255,45,120"];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      var density = Math.min(110, Math.floor(canvas.width / 14));
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    }

    function seed() {
      var count = Math.min(90, Math.floor((canvas.width * canvas.height) / 16000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push(createParticle());
      }
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 连线
      var linkDist = 120;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var a = particles[i];
          var b = particles[j];
          var dx = a.x - b.x;
          var dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < linkDist) {
            var alpha = (1 - dist / linkDist) * 0.35;
            ctx.strokeStyle = "rgba(" + a.c + "," + alpha + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 与鼠标连线
      if (mouse.x !== null) {
        for (var k = 0; k < particles.length; k++) {
          var p = particles[k];
          var mdx = p.x - mouse.x;
          var mdy = p.y - mouse.y;
          var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 160) {
            var mAlpha = (1 - mdist / 160) * 0.25;
            ctx.strokeStyle = "rgba(0,229,255," + mAlpha + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      // 粒子
      for (var m = 0; m < particles.length; m++) {
        var pt = particles[m];
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.x < 0 || pt.x > canvas.width) pt.vx *= -1;
        if (pt.y < 0 || pt.y > canvas.height) pt.vy *= -1;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + pt.c + ",0.75)";
        ctx.shadowColor = "rgba(" + pt.c + ",0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      requestAnimationFrame(draw);
    }

    function onMouseMove(e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = null;
      mouse.y = null;
    }

    window.addEventListener("resize", function () {
      resize();
      seed();
    });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseout", onMouseLeave);

    resize();
    seed();
    draw();

    // 页面隐藏时暂停动画，节省资源
    document.addEventListener("visibilitychange", function () {
      running = document.visibilityState === "visible";
      if (running) draw();
    });
  }

  /* ---------- 6. 打字机标题 ---------- */
  function initTypewriter() {
    var el = document.getElementById("typewriter");
    if (!el) return;

    var phrases = [
      "Build cool products.",
      "独立开发者 · nocau",
      "小程序 · Android · AI",
      "代码改变生活。"
    ];

    var phraseIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var speed = 70;
    var delay = 1600;

    function tick() {
      var current = phrases[phraseIndex];

      if (!deleting) {
        charIndex++;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, delay);
          return;
        }
        setTimeout(tick, speed);
      } else {
        charIndex--;
        el.textContent = current.slice(0, charIndex);
        if (charIndex === 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(tick, 350);
          return;
        }
        setTimeout(tick, 36);
      }
    }

    tick();
  }

  /* ---------- 7. 数字统计动画 ---------- */
  function initCounters() {
    var nums = document.querySelectorAll(".stat .num");
    if (!nums.length) return;

    if (!("IntersectionObserver" in window)) {
      nums.forEach(function (el) { el.textContent = el.getAttribute("data-target"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          observer.unobserve(el);

          var target = parseInt(el.getAttribute("data-target"), 10) || 0;
          var suffix = el.getAttribute("data-suffix") || "";
          var duration = 1400;
          var start = null;

          function step(ts) {
            if (!start) start = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased) + suffix;
            if (progress < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
        });
      },
      { threshold: 0.4 }
    );

    nums.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 8. 技能进度条 ---------- */
  function initSkills() {
    var bars = document.querySelectorAll(".skill-bar .fill");
    if (!bars.length) return;

    if (!("IntersectionObserver" in window)) {
      bars.forEach(function (bar) { bar.style.width = bar.getAttribute("data-progress") + "%"; });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var bar = entry.target;
          observer.unobserve(bar);
          bar.style.width = bar.getAttribute("data-progress") + "%";
        });
      },
      { threshold: 0.5 }
    );

    bars.forEach(function (bar) { observer.observe(bar); });
  }

  /* ---------- 9. 项目筛选 ---------- */
  function initProjectFilter() {
    var bar = document.getElementById("filter-bar");
    if (!bar) return;

    var buttons = bar.querySelectorAll(".filter-btn");
    var cards = document.querySelectorAll(".project-card");
    var emptyTip = document.getElementById("empty-tip");

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");

        var filter = btn.getAttribute("data-filter");
        var visible = 0;

        cards.forEach(function (card) {
          var category = card.getAttribute("data-category");
          var match = filter === "all" || category === filter;
          if (match) {
            card.classList.remove("hide");
            card.classList.remove("show");
            void card.offsetWidth; // 触发重排以重放动画
            card.classList.add("show");
            visible++;
          } else {
            card.classList.add("hide");
          }
        });

        if (emptyTip) {
          emptyTip.style.display = visible === 0 ? "block" : "none";
        }
      });
    });
  }

  /* ---------- 10. 回到顶部 ---------- */
  function initBackToTop() {
    var btn = document.getElementById("back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 480) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    }, { passive: true });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 11. 联系表单校验 ---------- */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    var msg = document.getElementById("form-message");

    function setError(input, flag) {
      input.classList.toggle("error", flag);
    }

    function showMessage(text, type) {
      if (!msg) return;
      msg.textContent = text;
      msg.className = "form-message " + type;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("name");
      var email = document.getElementById("email");
      var message = document.getElementById("message");

      var ok = true;

      if (!name.value.trim()) {
        setError(name, true); ok = false;
      } else {
        setError(name, false);
      }

      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.value.trim() || !emailRe.test(email.value.trim())) {
        setError(email, true); ok = false;
      } else {
        setError(email, false);
      }

      if (!message.value.trim() || message.value.trim().length < 5) {
        setError(message, true); ok = false;
      } else {
        setError(message, false);
      }

      if (!ok) {
        showMessage("请检查表单：姓名、有效邮箱和不少于 5 字的留言内容。", "error");
        return;
      }

      // 清除错误态
      [name, email, message].forEach(function (el) { setError(el, false); });

      showMessage("发送成功（演示模式）。静态站点未接入后端，可对接 Formspree 等表单服务。", "success");
      form.reset();
    });

    // 输入时清除错误态
    form.querySelectorAll(".form-control").forEach(function (input) {
      input.addEventListener("input", function () {
        setError(input, false);
      });
    });
  }

  /* ---------- 12. 页脚年份 ---------- */
  function initYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- 13. 初始化 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initThemeToggle();
    initNavToggle();
    initActiveNav();
    initReveal();
    initParticles();
    initTypewriter();
    initCounters();
    initSkills();
    initProjectFilter();
    initBackToTop();
    initContactForm();
    initYear();
  });
})();
