/* ============================================================
   nocau · 极简交互脚本
   主题切换 / 导航 / 打字机 / 统计数字 / 技能条 / 筛选 /
   表单校验 / 滚动进度 / 光标跟随 / 渐入动画 / 页面过渡 / 粒子点阵
   ============================================================ */
(function () {
  "use strict";

  /* 渐进增强：JS 就绪后开启 reveal 隐藏门控；无 JS / 脚本环境异常时 .reveal 保持默认可见，
     保证整页截图、后台加载等 IO 无法触发的场景首屏内容不透明 */
  document.documentElement.classList.add("js");

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
    var themeTimer = null;
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      var root = document.documentElement;
      root.classList.add("theme-switching");
      if (themeTimer) clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { root.classList.remove("theme-switching"); }, 320);
      sync(cur);
    });
  }

  /* ============ 2. 移动导航 ============ */
  function initNavToggle() {
    var toggle = $(".nav-toggle");
    var links = $("#nav-links");
    if (!toggle || !links) return;
    function setNav(open) {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      /* 打开菜单时锁定页面滚动，防止滚动穿透 */
      document.body.classList.toggle("nav-open", open);
    }
    function closeNav() {
      if (links.classList.contains("open")) setNav(false);
    }
    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setNav(!links.classList.contains("open"));
    });
    /* 点击链接关闭菜单 */
    $all("a", links).forEach(function (a) {
      a.addEventListener("click", function () { closeNav(); });
    });
    /* 点击菜单与按钮外部关闭 */
    document.addEventListener("click", function (e) {
      if (!links.classList.contains("open")) return;
      if (e.target && e.target.closest && (e.target.closest("#nav-links") || e.target.closest(".nav-toggle"))) return;
      closeNav();
    });
    /* Escape 关闭 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNav();
    });
    /* 视口拉宽到桌面断点以上时清理锁定状态 */
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900 && links.classList.contains("open")) setNav(false);
    }, { passive: true });
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
      setMsg("演示表单：留言不会真的发送。如需联系，请使用页面顶部的邮箱或微信。", "success");
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

    /* 首屏兜底：整页截图 / 后台标签 / IO 永不触发时，对已进入视口的元素强制补 is-visible，
       不依赖 IO 也必然可见；视口外元素仍保留滚动触发 */
    function forceInViewportVisible() {
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      els.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var r = el.getBoundingClientRect();
        if (r.top <= vh && r.bottom >= -40) {
          el.classList.add("is-visible");
          io.unobserve(el);
        }
      });
    }
    setTimeout(forceInViewportVisible, 450);
    /* 后台 tab 定时器可能被冻结致 450ms 兜底未执行：切回前台可见时立即补一次，
       避免整页截图 / 验收时首屏元素仍停留在隐藏态 */
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") forceInViewportVisible();
    });
  }

  /* ============ 12b. 滚动策略：移除自定义 rAF 惯性缓动，恢复浏览器原生滚动 ============
     说明：自定义平滑滚动会在滚轮事件中 preventDefault + rAF 缓动，
     造成明显延迟、不跟手与不受控；这里直接移除该逻辑，滚轮零延迟。 */

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

  /* ============ 13. 页面过渡（站内链接：预加载 + 丝滑离场 + 入场动画） ============ */
  var navTimer = null;
  /* 经站内链接跳转进入时，新页加载后播放入场动画（旧页在离场前写入 sessionStorage 标记） */
  function applyPageEnter() {
    if (prefersReduced) return;
    var pending = null;
    try { pending = sessionStorage.getItem("nocau-pending-page"); } catch (e) {}
    if (!pending) return;
    try { sessionStorage.removeItem("nocau-pending-page"); } catch (e) {}
    var bodyEl = document.body;
    bodyEl.classList.add("page-enter");
    setTimeout(function () { bodyEl.classList.remove("page-enter"); }, 650);
  }
  /* 点击目标链接后预取页面 HTML，让新页资源更快就绪 */
  function prefetchPage(href) {
    try {
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.as = "document";
      l.href = href;
      document.head.appendChild(l);
    } catch (e) { /* 预取失败不影响跳转 */ }
  }
  function initPageTransitions() {
    if (prefersReduced) return;
    $all("a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href.indexOf("http") === 0 || href.indexOf("#") === 0 || a.hasAttribute("aria-disabled") || a.target === "_blank") return;
      if (!href.match(/\.(html?|php|aspx)?($|\?)/)) return;
      a.addEventListener("click", function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        prefetchPage(href);
        document.body.classList.add("page-leaving");
        try { sessionStorage.setItem("nocau-pending-page", "1"); } catch (err) {}
        clearTimeout(navTimer);
        navTimer = setTimeout(function () { window.location.href = href; }, 300);
      });
    });
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
    applyPageEnter();
    initThemeToggle();
    initNavToggle();
    initNavActive();
    initYear();
    initCounters();
    initSkillBars();
    initFilter();
    initDisabledLinks();
    initContactForm();
    initBackToTop();
    initIdeaFilters();
    initIdeaExpand();
        initReveal();
    initPageTransitions();
  });
})();
