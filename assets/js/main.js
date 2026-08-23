/* ============================================================
   nocau · 极简交互脚本
   主题切换 / 导航 / 打字机 / 统计数字 / 技能条 / 筛选 /
   表单校验 / 滚动进度 / 光标跟随 / 渐入动画 / 页面过渡 / 粒子点阵
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ============ 工具 ============ */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ============ 1. 主题切换 ============ */
  function initThemeToggle() {
    var btn = $("#theme-toggle");
    if (!btn) return;
    var sun = $(".icon-sun", btn);
    var moon = $(".icon-moon", btn);
    function sync(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem("nocau-theme", theme); } catch (e) { /* noop */ }
      if (sun) sun.style.display = theme === "dark" ? "none" : "block";
      if (moon) moon.style.display = theme === "dark" ? "block" : "none";
    }
    var saved = null;
    try { saved = localStorage.getItem("nocau-theme"); } catch (e) { /* noop */ }
    var initial = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    sync(initial);
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      sync(cur);
    });
  }

  /* ============ 2. 移动导航 ============ */
  function initNavToggle() {
    var toggle = $(".nav-toggle");
    var links = $("#nav-links");
    if (!toggle || !links) return;
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all("a", links).forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ============ 3. 打字机 ============ */
  function initTypewriter() {
    var el = $("#typewriter");
    if (!el) return;
    var text = el.getAttribute("data-text") || "Independent Developer · nocau";
    var i = 0;
    function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(tick, 55);
      }
    }
    setTimeout(tick, 500);
  }

  /* ============ 4. 数字统计动画 ============ */
  function initCounters() {
    var nums = $all(".stat .num[data-target]");
    if (!nums.length) return;
    function animate(el) {
      var target = parseFloat(el.getAttribute("data-target"));
      var suffix = el.getAttribute("data-suffix") || "";
      var dur = 1200;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          animate(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ============ 5. 技能条动画 ============ */
  function initSkillBars() {
    var fills = $all(".skill-bar .fill[data-progress]");
    if (!fills.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.style.width = en.target.getAttribute("data-progress") + "%";
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    fills.forEach(function (f) { io.observe(f); });
  }

  /* ============ 6. 项目筛选 ============ */
  function initFilter() {
    var bar = $("#filter-bar");
    if (!bar) return;
    var btns = $all(".filter-btn", bar);
    var cards = $all(".project-card");
    var empty = $("#empty-tip");
    function apply(filter) {
      var visible = 0;
      cards.forEach(function (card) {
        var match = filter === "all" || card.getAttribute("data-category") === filter;
        card.style.display = match ? "" : "none";
        if (match) visible++;
      });
      if (empty) empty.style.display = visible ? "none" : "block";
      btns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-filter") === filter); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-filter")); });
    });
  }

  /* ============ 7. 占位链接拦截 ============ */
  function initDisabledLinks() {
    $all("a[aria-disabled='true']").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); });
    });
  }

  /* ============ 8. 表单校验 ============ */
  function initContactForm() {
    var form = $("#contact-form");
    if (!form) return;
    var msg = $("#form-message");
    function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = ($("#name").value || "").trim();
      var email = ($("#email").value || "").trim();
      var message = ($("#message").value || "").trim();
      if (!name || name.length < 1 || name.length > 50) { setMsg("请输入 1-50 字的姓名。", "error"); return; }
      if (!email || email.length > 120 || !emailOk(email)) { setMsg("请输入有效的邮箱地址。", "error"); return; }
      if (!message || message.length < 5 || message.length > 1000) { setMsg("留言内容需在 5-1000 字之间。", "error"); return; }
      setMsg("已收到，感谢留言。（静态站点演示，不会真的发送）", "success");
      form.reset();
    });
    function setMsg(t, cls) { if (msg) { msg.textContent = t; msg.className = "form-message " + cls; } }
  }

  /* ============ 9. 回到顶部 ============ */
  function initBackToTop() {
    var btn = $("#back-to-top");
    if (!btn) return;
    function onScroll() {
      var show = window.scrollY > 480;
      btn.classList.toggle("show", show);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" }); });
  }

  /* ============ 10. 滚动进度条 ============ */
  function initScrollProgress() {
    if (prefersReduced) return;
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop || document.body.scrollTop) / max * 100 : 0;
      bar.style.width = pct + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ============ 11. 光标跟随（桌面端，低透明度无辉光） ============ */
  function initCursorFX() {
    if (prefersReduced || !finePointer) return;
    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    dot.setAttribute("aria-hidden", "true");
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add("cursor-on");

    var mx = 0, my = 0, rx = 0, ry = 0;
    var hoverable = "a, button, .filter-btn, .skill-tag, .tag, .theme-toggle, .project-link, .back-to-top, input, textarea, .contact-method";

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + "px";
      dot.style.top = my + "px";
    }, { passive: true });

    var raf = null;
    function loop() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + "px";
      ring.style.top = ry + "px";
      raf = requestAnimationFrame(loop);
    }
    loop();

    document.addEventListener("mouseover", function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverable)) {
        ring.classList.add("cursor-hover");
      }
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverable)) {
        ring.classList.remove("cursor-hover");
      }
    }, { passive: true });
  }

  /* ============ 12. 渐入动画 ============ */
  function initReveal() {
    var els = $all(".reveal");
    if (!els.length) return;
    if (prefersReduced) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    /* 错峰：未显式设置 data-delay 的元素按顺序交错 60ms，过渡更自然 */
    els.forEach(function (el, i) {
      if (!el.hasAttribute("data-delay")) {
        el.style.transitionDelay = ((i % 6) * 60) + "ms";
      }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ============ 12b. 惯性平滑滚动（桌面滚轮，rAF 克制缓动） ============ */
  function initSmoothScroll() {
    if (prefersReduced || !finePointer) return;
    var target = window.scrollY || document.documentElement.scrollTop;
    var current = target;
    var raf = null;
    var max = 0;

    function updateMax() {
      max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function loop() {
      var diff = target - current;
      if (Math.abs(diff) < 0.5) {
        window.scrollTo(0, Math.round(target));
        raf = null;
        return;
      }
      current += diff * 0.09;
      window.scrollTo(0, Math.round(current));
      raf = requestAnimationFrame(loop);
    }
    function kick() {
      if (raf === null) raf = requestAnimationFrame(loop);
    }
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.shiftKey) return; /* 保留浏览器缩放 / 横向行为 */
      if (max <= 0) return;
      e.preventDefault();
      var delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= window.innerHeight;
      target += delta;
      target = Math.max(0, Math.min(target, max));
      kick();
    }, { passive: false });
    /* 键盘 / 锚点 / 触摸等原生滚动期间，同步基准避免跳动 */
    window.addEventListener("scroll", function () {
      if (raf !== null) return;
      var y = window.scrollY || document.documentElement.scrollTop;
      current = y;
      target = y;
    }, { passive: true });
    window.addEventListener("resize", updateMax, { passive: true });
    updateMax();
  }

  /* ============ 12c. Hero 视差（标题与按钮轻微上移淡出） ============ */
  function initHeroParallax() {
    var hero = $(".hero");
    if (!hero || prefersReduced || !finePointer) return;
    var items = $all(".hero .display-title, .hero .type-line, .hero .hero-actions");
    if (!items.length) return;
    var maxY = 240;
    var ticking = false;
    function update() {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (y > 0) {
        if (!hero.classList.contains("parallax-on")) {
          hero.classList.add("parallax-on");
          items.forEach(function (el) { el.classList.add("parallax-live"); });
        }
        var p = Math.min(y / maxY, 1);
        var eased = 1 - Math.pow(1 - p, 2);
        items.forEach(function (el, i) {
          var factor = 0.14 + i * 0.05;
          el.style.transform = "translateY(" + (eased * factor * y).toFixed(1) + "px)";
          el.style.opacity = String(Math.max(0, 1 - eased * 0.7));
        });
      } else {
        hero.classList.remove("parallax-on");
        items.forEach(function (el) {
          el.classList.remove("parallax-live");
          el.style.transform = "";
          el.style.opacity = "";
        });
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ============ 13. 页面过渡（站内链接淡出） ============ */
  function initPageTransitions() {
    if (prefersReduced) return;
    $all("a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.indexOf("http") === 0 || href.indexOf("#") === 0 || a.hasAttribute("aria-disabled") || a.target === "_blank") return;
      if (!href.match(/\.(html?|php|aspx)?($|\?)/)) return;
      a.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        document.body.classList.add("page-leaving");
        setTimeout(function () { window.location.href = href; }, 200);
      });
    });
  }

  /* ============ 14. 极淡粒子点阵（黑白灰、无连线、无辉光） ============ */
  function initParticles() {
    var canvas = $("#particle-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    var dots = [];
    var W = 0, H = 0;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      build();
    }

    function build() {
      var count = Math.min(60, Math.floor((W * H) / 26000));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.2 + 0.5,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var alpha = dark ? 0.28 : 0.4;
      dots.forEach(function (d) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < -5) d.x = W + 5; if (d.x > W + 5) d.x = -5;
        if (d.y < -5) d.y = H + 5; if (d.y > H + 5) d.y = -5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(150, 160, 170, " + alpha.toFixed(2) + ")";
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    var ro = null;
    function onResize() { if (ro) return; ro = setTimeout(function () { ro = null; resize(); }, 200); }
    window.addEventListener("resize", onResize, { passive: true });
    resize();
    if (prefersReduced) {
      draw();
      return;
    }
    draw();
  }

  /* ============ 15. 导航当前页高亮 ============ */
  function initNavActive() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    if (!path) path = "index.html";
    $all(".nav-links a").forEach(function (a) {
      var href = (a.getAttribute("href") || "").split("/").pop();
      if (href === path) a.classList.add("active");
    });
  }

  /* ============ 启动 ============ */
  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initNavToggle();
    initNavActive();
    initTypewriter();
    initCounters();
    initSkillBars();
    initFilter();
    initDisabledLinks();
    initContactForm();
    initBackToTop();
    initScrollProgress();
    initCursorFX();
    initSmoothScroll();
    initHeroParallax();
    initReveal();
    initPageTransitions();
    initParticles();
  });
})();
