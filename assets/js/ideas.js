/* ============================================================
   ideas.js · 想法项目页交互（分区筛选 / 搜索联动 / 详情面板）
   捕获阶段委托：拦截 main.js 旧 ideas 绑定，避免双绑定冲突
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- 筛选映射：data-direction 包含匹配 ---------- */
  var GROUPS = { c: "code", b: "ideas", a: "works" };
  var RULES = {
    code: ["实用代码"],
    tool: ["工具"],
    ai: ["AI应用", "图像识别", "语音", "人脸", "目标检测", "手势识别"],
    eff: ["效率协作"],
    hwiot: ["硬件", "物联网", "机器人", "无人机"]
  };

  /* ---------- 元素引用 ---------- */
  var bar = $(".idea-filter-bar");
  var cards = $all(".idea-card");
  var tip = $("#idea-empty-tip");
  var search = $("#idea-search");
  var count = $("#idea-count");
  var collapseAll = $("#idea-collapse-all");
  var overlay = $("#idea-panel-overlay");
  var panelClose = $("#idea-panel-close");
  var groupHeads = $all(".idea-group");
  var zoneBtns = $all(".idea-zone-btn");

  var activeKey = "all";
  var keyword = "";
  var openCard = null;

  function dirMatch(dirStr, key) {
    if (key === "all") return true;
    var rules = RULES[key];
    if (!rules) return false;
    return rules.some(function (r) { return dirStr.indexOf(r) !== -1; });
  }

  function cardGroup(card) {
    var badge = $(".idea-badge", card);
    if (!badge) return "ideas";
    var ch = badge.textContent.charAt(0);
    return GROUPS[ch.toLowerCase()] || "ideas";
  }

  function updateGroups() {
    groupHeads.forEach(function (head) {
      var g = head.getAttribute("data-group");
      var visible = cards.filter(function (c) {
        return !c.classList.contains("hide") && cardGroup(c) === g;
      }).length;
      head.style.display = visible > 0 ? "" : "none";
      var n = $(".idea-group-count", head);
      if (n) {
        var tpl = n.getAttribute("data-count") || "{n}";
        n.textContent = tpl.replace("{n}", String(visible));
      }
    });
    zoneBtns.forEach(function (btn) {
      var g = btn.getAttribute("data-zone");
      var head = groupHeads.find(function (h) { return h.getAttribute("data-group") === g; });
      btn.hidden = !head || head.style.display === "none";
    });
  }

  var firstRun = true;
  function apply() {
    var kw = (keyword || "").toLowerCase();
    var shown = 0;
    cards.forEach(function (card) {
      var dir = card.getAttribute("data-direction") || "";
      var ok = dirMatch(dir, activeKey);
      if (ok && kw) {
        ok = (card.textContent || "").toLowerCase().indexOf(kw) !== -1;
      }
      card.classList.toggle("hide", !ok);
      if (ok) {
        shown++;
        if (!firstRun) {
          card.classList.remove("filtered-in");
          void card.offsetWidth;
          card.classList.add("filtered-in");
        }
      }
    });
    updateGroups();
    firstRun = false;
    if (tip) tip.classList.toggle("visible", shown === 0);
    if (count) {
      var tpl = count.getAttribute("data-count") || "{n}";
      count.textContent = tpl.replace("{n}", String(shown));
    }
  }

  function setFilter(key, btn) {
    activeKey = key;
    $all(".idea-filter-btn", bar).forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    apply();
  }

  /* ---------- 详情面板 ---------- */
  function openPanel(card) {
    var badge = $(".idea-badge", card);
    var title = $("h2", card);
    var subtitle = $(".idea-subtitle", card);
    var meta = $(".idea-meta", card);
    var detail = $(".idea-detail", card);
    if (!overlay || !title) return;
    var pBadge = $("#idea-panel-badge");
    var pTitle = $("#idea-panel-title");
    var pSub = $("#idea-panel-subtitle");
    var pMeta = $("#idea-panel-meta");
    var pBody = $("#idea-panel-body");
    if (pBadge) pBadge.textContent = badge ? badge.textContent.trim() : "";
    if (pTitle) pTitle.textContent = title.textContent.trim();
    if (pSub) pSub.textContent = subtitle ? subtitle.textContent.trim() : "";
    if (pMeta) pMeta.innerHTML = meta ? meta.innerHTML : "";
    if (pBody) pBody.innerHTML = detail ? detail.innerHTML : "";
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    openCard = card;
    var closeBtn = $("#idea-panel-close");
    if (closeBtn) closeBtn.focus();
  }

  function closePanel() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
    openCard = null;
    if (search) search.focus();
  }

  /* ---------- 捕获阶段拦截（阻止 main.js 旧绑定执行） ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var btn = t.closest(".idea-filter-btn");
    if (btn && bar && bar.contains(btn)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setFilter(btn.getAttribute("data-direction") || "all", btn);
      return;
    }

    var zbtn = t.closest(".idea-zone-btn");
    if (zbtn && zbtn.hidden !== true) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var zg = zbtn.getAttribute("data-zone");
      var zhead = groupHeads.find(function (h) { return h.getAttribute("data-group") === zg; });
      if (zhead && zhead.style.display !== "none") {
        var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        zhead.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
      return;
    }

    var head = t.closest(".idea-card .idea-head");
    if (head) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var card = head.closest(".idea-card");
      if (card) openPanel(card);
      return;
    }

    if (collapseAll && (t === collapseAll || collapseAll.contains(t))) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closePanel();
      return;
    }

    if (overlay && !overlay.hidden) {
      if (panelClose && (t === panelClose || panelClose.contains(t))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closePanel();
        return;
      }
      if (t === overlay) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closePanel();
        return;
      }
    }
  }, true);

  document.addEventListener("input", function (e) {
    if (e.target && e.target === search) {
      e.stopImmediatePropagation();
      keyword = search.value;
      apply();
    }
  }, true);

  document.addEventListener("search", function (e) {
    if (e.target && e.target === search) {
      e.stopImmediatePropagation();
      keyword = search.value;
      apply();
    }
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) {
      closePanel();
    }
  }, true);

  /* ---------- 初始状态：默认收起、全部显示 ---------- */
  $all(".idea-card.open").forEach(function (c) { c.classList.remove("open"); });
  apply();
})();
