/* ============================================================
   nocau.com — 主交互脚本（无依赖，原生 JS）
   功能：主题切换 / 汉堡导航 / 平滑滚动 / 滚动渐入 /
        极淡点阵背景 / 打字机标题 / 数字统计 / 技能进度 /
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
    var sun = toggle.querySelector(".icon-sun");
    var moon = toggle.querySelector(".icon-moon");
    if (sun) sun.style.display = isLight ? "none" : "";
    if (moon) moon.style.display = isLight ? "" : "none";
  }

  /* ---------- 2. 汉堡导航 ---------- */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var open = toggle.classList.toggle("open");
      links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
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

  /* ---------- 3.5 禁用占位链接（aria-disabled，阻止跳转） ---------- */
  function initDisabledLinks() {
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[aria-disabled="true"]') : null;
      if (a) e.preventDefault();
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

  /* ---------- 5. 极淡黑白灰点阵背景（无连线、无辉光） ---------- */
  function initParticles() {
    var canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var ctx = canvas.getContext("2d");
    var particles = [];
    var running = true;
    var colors = ["205,209,217", "150,154,162", "100,104,112"];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.3 + 0.4,
        c: colors[Math.floor(Math.random() * colors.length)]
      };
    }

    function seed() {
      var count = Math.min(46, Math.floor((canvas.width * canvas.height) / 42000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push(createParticle());
      }
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + p.c + ",0.30)";
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", function () {
      resize();
      seed();
    });

    resize();
    seed();
    draw();

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
      "微信小程序 · Android · AI 平台",
      "独立开发者 · nocau"
    ];

    var phraseIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var speed = 70;
    var delay = 1800;

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
      var nameVal = name.value.trim();
      var emailVal = email.value.trim();
      var msgVal = message.value.trim();

      if (!nameVal || nameVal.length > 50) {
        setError(name, true); ok = false;
      } else {
        setError(name, false);
      }

      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || emailVal.length > 120 || !emailRe.test(emailVal)) {
        setError(email, true); ok = false;
      } else {
        setError(email, false);
      }

      if (!msgVal || msgVal.length < 5 || msgVal.length > 1000) {
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
    initDisabledLinks();
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
