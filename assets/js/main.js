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

  /* ============ 11. 光标微光发散（桌面端，柔和光晕无硬边） ============ */
  function initCursorFX() {
    if (prefersReduced || !finePointer) return;
    var glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    document.body.classList.add("cursor-on");

    var mx = 0, my = 0, cx = 0, cy = 0;
    var hoverable = "a, button, .filter-btn, .skill-tag, .tag, .theme-toggle, .project-link, .back-to-top, input, textarea, .contact-method";

    var raf = null;
    function loop() {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      if (Math.abs(mx - cx) > 0.1 || Math.abs(my - cy) > 0.1) {
        glow.style.transform = "translate3d(" + cx.toFixed(1) + "px, " + cy.toFixed(1) + "px, 0)";
        raf = requestAnimationFrame(loop);
      } else {
        glow.style.transform = "translate3d(" + mx.toFixed(1) + "px, " + my.toFixed(1) + "px, 0)";
        raf = null;
      }
    }
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (raf === null) raf = requestAnimationFrame(loop);
    }, { passive: true });

    document.addEventListener("mouseover", function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverable)) {
        glow.classList.add("cursor-hover");
      }
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      if (e.target && e.target.closest && e.target.closest(hoverable)) {
        glow.classList.remove("cursor-hover");
      }
    }, { passive: true });
  }

  /* ============ 11b. 卡片 3D tilt（克制角度） ============ */
  function initTilt() {
    if (prefersReduced || !finePointer) return;
    var cards = $all(".project-card, .feature-card, .idea-card");
    if (!cards.length) return;
    var MAX = 6;
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.classList.add("tilt-live");
        card.style.setProperty("--tilt-x", (-py * MAX).toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", (px * MAX).toFixed(2) + "deg");
      }, { passive: true });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("tilt-live");
        card.style.removeProperty("--tilt-x");
        card.style.removeProperty("--tilt-y");
      });
    });
  }

  /* ============ 11c. 点击水面波纹（全局，同心圆环扩散，克制低饱和） ============ */
  function initRipple() {
    if (prefersReduced) return;
    var layer = document.createElement("div");
    layer.className = "water-layer";
    layer.setAttribute("aria-hidden", "true");
    document.body.appendChild(layer);
    document.addEventListener("pointerdown", function (e) {
      var ring = document.createElement("span");
      ring.className = "water-ripple";
      var size = 48;
      ring.style.width = size + "px";
      ring.style.height = size + "px";
      ring.style.left = (e.clientX - size / 2) + "px";
      ring.style.top = (e.clientY - size / 2) + "px";
      layer.appendChild(ring);
      ring.addEventListener("animationend", function () { ring.remove(); });
    }, { passive: true });
  }

  /* ============ 11d. Hero 视差光球（低饱和，随鼠标缓动） ============ */
  function initHeroOrb() {
    var orb = $(".hero-orb");
    if (!orb || prefersReduced || !finePointer) return;
    var ox = 0, oy = 0, cx = 0, cy = 0;
    var raf = null;
    function loop() {
      cx += (ox - cx) * 0.06;
      cy += (oy - cy) * 0.06;
      orb.style.transform = "translate(calc(-50% + " + cx.toFixed(1) + "px), calc(-50% + " + cy.toFixed(1) + "px))";
      if (Math.abs(ox - cx) > 0.1 || Math.abs(oy - cy) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }
    document.addEventListener("mousemove", function (e) {
      ox = (e.clientX / window.innerWidth - 0.5) * 2 * 14;
      oy = (e.clientY / window.innerHeight - 0.5) * 2 * 12;
      if (raf === null) raf = requestAnimationFrame(loop);
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

  /* ============ 12b. 滚动策略：移除自定义 rAF 惯性缓动，恢复浏览器原生滚动 ============
     说明：自定义平滑滚动会在滚轮事件中 preventDefault + rAF 缓动，
     造成明显延迟、不跟手与不受控；这里直接移除该逻辑，滚轮零延迟。 */

  /* ============ 12c. Hero 视差（标题与按钮轻微上移淡出） ============ */
  function initHeroParallax() {
    var hero = $(".hero");
    if (!hero || prefersReduced || !finePointer) return;
    var items = $all(".hero .display-title, .hero .type-line, .hero .hero-actions");
    if (!items.length) return;
    var maxY = 200;
    var ticking = false;
    var prev = items.map(function () { return { y: -1, o: -1 }; });
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
          var factor = 0.09 + i * 0.035;
          var ty = eased * factor * y;
          var op = Math.max(0, 1 - eased * 0.7);
          if (Math.abs(ty - prev[i].y) > 0.6) {
            el.style.transform = "translateY(" + ty.toFixed(1) + "px)";
            prev[i].y = ty;
          }
          if (Math.abs(op - prev[i].o) > 0.02) {
            el.style.opacity = String(op);
            prev[i].o = op;
          }
        });
      } else {
        hero.classList.remove("parallax-on");
        items.forEach(function (el, i) {
          el.classList.remove("parallax-live");
          el.style.transform = "";
          el.style.opacity = "";
          prev[i].y = -1; prev[i].o = -1;
        });
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ============ 12d. 想法项目：方向筛选（多选，单选全部） ============ */
  function initIdeaFilters() {
    var bar = $(".idea-filter-bar");
    var cards = $all(".idea-card");
    if (!bar || !cards.length) return;
    var btns = $all(".idea-filter-btn", bar);
    var tip = $("#idea-empty-tip");
    var search = $("#idea-search");
    var count = $("#idea-count");
    var active = {};
    var keyword = "";
    function apply() {
      var keys = Object.keys(active);
      var showAll = keys.length === 0;
      var kw = keyword.toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var dirs = (card.getAttribute("data-direction") || "").split(" ");
        var match = (showAll || dirs.some(function (d) { return active[d]; }));
        if (match && kw) {
          match = (card.textContent || "").toLowerCase().indexOf(kw) >= 0;
        }
        card.classList.toggle("hide", !match);
        if (match) shown++;
      });
      if (tip) tip.style.display = shown === 0 ? "block" : "none";
      if (count) {
        var label = (count.getAttribute("data-count") || "{n} 个方案").replace("{n}", shown + "/" + cards.length);
        count.textContent = label;
      }
    }
    if (search) {
      search.addEventListener("input", function () {
        keyword = search.value;
        apply();
      });
      search.addEventListener("search", function () {
        keyword = search.value;
        apply();
      });
    }
    var collapseAll = $("#idea-collapse-all");
    if (collapseAll) {
      collapseAll.addEventListener("click", function () {
        $all(".idea-card.open").forEach(function (c) {
          c.classList.remove("open");
          var tgl = $(".idea-toggle", c);
          if (tgl) tgl.setAttribute("aria-expanded", "false");
        });
      });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        var d = b.getAttribute("data-direction");
        if (d === "all") { active = {}; }
        else if (active[d]) { delete active[d]; }
        else { active[d] = true; }
        btns.forEach(function (x) {
          var xd = x.getAttribute("data-direction");
          var on = xd === "all" ? Object.keys(active).length === 0 : !!active[xd];
          x.classList.toggle("active", on);
        });
        apply();
      });
    });
  }

  /* ============ 12e. 想法项目：卡片展开 / 收起 ============ */
  function initIdeaExpand() {
    $all(".idea-card").forEach(function (card) {
      var head = $(".idea-head", card);
      if (!head) return;
      head.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("a")) return;
        var open = card.classList.toggle("open");
        var toggle = $(".idea-toggle", head);
        if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      $all(".idea-card.open").forEach(function (c) {
        c.classList.remove("open");
        var tgl = $(".idea-toggle", c);
        if (tgl) tgl.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ============ 12f. 想法项目：卡片筛选 ============

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

  /* ============ 14. 极淡粒子点阵（黑白灰、无连线、无辉光，低负载） ============ */
  function initParticles() {
    var canvas = $("#particle-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    var dots = [];
    var W = 0, H = 0;
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var frame = 0;

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
      var count = Math.min(40, Math.floor((W * H) / 32000));
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.1 + 0.5,
          vx: (Math.random() - 0.5) * 0.07,
          vy: (Math.random() - 0.5) * 0.07
        });
      }
    }

    function draw() {
      frame++;
      /* 隔帧绘制：绘制频率减半，肉眼几乎无感但显著降低 CPU 占用 */
      if (frame % 2 === 0) { requestAnimationFrame(draw); return; }
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


  /* ============ 15c. 页脚年份 ============ */
  function initYear() {
    var el = $("#year");
    if (el) el.textContent = String(new Date().getFullYear());
  }


  /* ============ 启动 ============ */
  document.addEventListener("DOMContentLoaded", function () {
    initThemeToggle();
    initNavToggle();
    initNavActive();
    initYear();
    initTypewriter();
    initCounters();
    initSkillBars();
    initFilter();
    initDisabledLinks();
    initContactForm();
    initBackToTop();
    initScrollProgress();
    initCursorFX();
    initTilt();
    initRipple();
    initHeroOrb();
    initHeroParallax();
    initIdeaFilters();
    initIdeaExpand();
        initReveal();
    initPageTransitions();
  });
})();
