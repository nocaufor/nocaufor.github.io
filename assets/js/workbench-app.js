/* 个人工作台应用逻辑（外部 JS，遵守站点 CSP script-src 'self'）
 * 依赖：assets/vendor/supabase/supabase.js（本地化 UMD，禁止外链 CDN）
 * 模块：项目状态 / API 余额 / 快捷链接 / 备忘
 * 数据：Supabase 私有表 public.workbench_items（RLS 仅本人，见 docs/workbench-schema.sql）
 */
(function () {
  "use strict";

  /* ===== 占位配置：等待用户提供 Supabase 项目 URL 与 anon key 后替换 ===== */
  var SUPABASE_URL = "PASTE_SUPABASE_URL_HERE";
  var SUPABASE_ANON_KEY = "PASTE_SUPABASE_ANON_KEY_HERE";
  var configured = SUPABASE_URL.indexOf("PASTE_") === -1 && SUPABASE_ANON_KEY.indexOf("PASTE_") === -1;

  /* ===== DOM ===== */
  var loginView = document.getElementById("login-view");
  var dashView = document.getElementById("dash-view");
  var loginForm = document.getElementById("login-form");
  var loginBtn = document.getElementById("login-btn");
  var loginMsg = document.getElementById("login-msg");
  var configHint = document.getElementById("config-hint");
  var configNotice = document.getElementById("config-notice");
  var dashUser = document.getElementById("dash-user");
  var dashMsg = document.getElementById("dash-msg");
  var logoutBtn = document.getElementById("logout-btn");
  var themeBtnLogin = document.getElementById("theme-btn-login");
  var themeBtnDash = document.getElementById("theme-btn-dash");
  var modal = document.getElementById("modal");
  var modalTitle = document.getElementById("modal-title");
  var itemForm = document.getElementById("item-form");
  var fTitle = document.getElementById("f-title");
  var fStatusWrap = document.getElementById("f-status-wrap");
  var fStatus = document.getElementById("f-status");
  var fValueWrap = document.getElementById("f-value-wrap");
  var fValueLabel = document.getElementById("f-value-label");
  var fValue = document.getElementById("f-value");
  var fDetail = document.getElementById("f-detail");
  var modalCancel = document.getElementById("modal-cancel");
  var modalSave = document.getElementById("modal-save");

  /* ===== 模块定义（字段语义对齐 AI hub：balance=余额+状态, project=状态+进度, link=名称+URL, note=标题+正文） ===== */
  var KINDS = ["project", "balance", "link", "note"];
  var MODULE = {
    project: {
      label: "项目状态",
      addLabel: "新增",
      statusOptions: ["进行中", "已完成", "暂停", "搁置"],
      valueLabel: "进度 / 关联链接",
      titlePh: "项目名称",
      detailPh: "一句话描述"
    },
    balance: {
      label: "API 余额",
      addLabel: "新增",
      statusOptions: ["ok", "warn", "over"],
      valueLabel: "余额数值",
      titlePh: "平台名（如 DeepSeek）",
      detailPh: "备注 / 月配额"
    },
    link: {
      label: "快捷链接",
      addLabel: "新增",
      statusOptions: [],
      valueLabel: "URL",
      titlePh: "链接名称",
      detailPh: "说明（可选）"
    },
    note: {
      label: "备忘",
      addLabel: "新增",
      statusOptions: [],
      valueLabel: "标签（可选）",
      titlePh: "标题",
      detailPh: "正文内容"
    }
  };
  var BADGE = {
    "进行中": "run", "已完成": "done", "暂停": "paused", "搁置": "hold",
    "ok": "ok", "warn": "warn", "over": "over"
  };

  var rowsCache = {};
  var editing = null;
  var currentKind = null;
  var user = null;

  /* ===== 主题（深浅双主题，localStorage 记忆；默认深色与站点一致） ===== */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("wb-theme", t); } catch (e) {}
  }
  function initTheme() {
    var t = "dark";
    try { t = localStorage.getItem("wb-theme") || "dark"; } catch (e) {}
    applyTheme(t);
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  }

  /* ===== 通用 ===== */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function setMsg(el, text) { el.textContent = text || ""; }
  function badge(txt) {
    var cls = BADGE[txt] ? "badge " + BADGE[txt] : "badge";
    return '<span class="' + cls + '">' + esc(txt) + "</span>";
  }

  /* ===== 视图切换 ===== */
  function showDash(sessionUser) {
    user = sessionUser;
    loginView.classList.add("hidden");
    dashView.classList.remove("hidden");
    dashUser.textContent = "已登录：" + (user && user.email ? user.email : "—");
    setMsg(dashMsg, "");
    if (!configured) {
      configNotice.classList.remove("hidden");
      configNotice.textContent = "后端未配置：请先在 assets/js/workbench-app.js 中填写 SUPABASE_URL / SUPABASE_ANON_KEY。";
      disableCrud(true);
      return;
    }
    configNotice.classList.add("hidden");
    loadAll();
  }
  function showLogin(msg) {
    user = null;
    dashView.classList.add("hidden");
    loginView.classList.remove("hidden");
    if (msg) setMsg(loginMsg, msg);
  }
  function disableCrud(off) {
    document.querySelectorAll(".btn-add, .row-edit, .row-del").forEach(function (b) {
      b.disabled = !!off;
      b.title = off ? "后端未配置，暂不可用" : "";
    });
  }

  /* ===== 数据加载与渲染 ===== */
  function loadAll() {
    if (!user) return;
    KINDS.forEach(function (kind) { loadKind(kind); });
  }
  function loadKind(kind) {
    client.from("workbench_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(function (res) {
        if (res.error) {
          setMsg(dashMsg, "读取「" + MODULE[kind].label + "」失败：" + (res.error.message || "未知错误"));
          return;
        }
        render(kind, res.data || []);
      })
      .catch(function (err) {
        setMsg(dashMsg, "读取「" + MODULE[kind].label + "」失败：" + (err && err.message ? err.message : "网络错误"));
      });
  }
  function render(kind, rows) {
    rowsCache[kind] = rows;
    var list = document.getElementById("items-" + kind);
    var empty = document.getElementById("empty-" + kind);
    if (!rows.length) {
      list.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    list.innerHTML = rows.map(function (r) { return rowHtml(kind, r); }).join("");
  }
  function rowHtml(kind, r) {
    var id = esc(r.id);
    var main = "";
    if (kind === "project") {
      main = '<div class="row-main"><div class="row-title">' + esc(r.title) + (r.status ? " " + badge(r.status) : "") + "</div>"
        + (r.detail ? '<div class="row-sub">' + esc(r.detail) + "</div>" : "")
        + (r.value ? '<div class="row-meta">' + esc(r.value) + "</div>" : "")
        + "</div>";
    } else if (kind === "balance") {
      main = '<div class="row-main"><div class="row-title">' + esc(r.title) + (r.status ? " " + badge(r.status) : "") + "</div>"
        + (r.value ? '<div class="row-value">' + esc(r.value) + "</div>" : "")
        + (r.detail ? '<div class="row-sub">' + esc(r.detail) + "</div>" : "")
        + "</div>";
    } else if (kind === "link") {
      main = '<div class="row-main"><div class="row-title">' + esc(r.title) + "</div>"
        + (r.value ? '<div class="row-sub"><a href="' + esc(r.value) + '" target="_blank" rel="noopener">' + esc(r.value) + "</a></div>" : "")
        + (r.detail ? '<div class="row-meta">' + esc(r.detail) + "</div>" : "")
        + "</div>";
    } else {
      main = '<div class="row-main"><div class="row-title">' + esc(r.title) + "</div>"
        + (r.detail ? '<div class="row-sub">' + esc(r.detail) + "</div>" : "")
        + (r.value ? '<div class="row-meta">' + esc(r.value) + "</div>" : "")
        + "</div>";
    }
    return '<li class="row" data-id="' + id + '" data-kind="' + esc(kind) + '">' + main
      + '<div class="row-ops"><button class="row-edit" type="button" title="编辑">编辑</button>'
      + '<button class="row-del" type="button" title="删除">删除</button></div></li>';
  }
  function findRecord(kind, id) {
    var rows = rowsCache[kind] || [];
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(id)) return rows[i];
    }
    return null;
  }

  /* ===== 新增 / 编辑弹层 ===== */
  function openModal(kind, record) {
    currentKind = kind;
    editing = record || null;
    var def = MODULE[kind];
    modalTitle.textContent = (editing ? "编辑" : "新增") + " · " + def.label;
    fTitle.value = editing ? editing.title : "";
    fTitle.placeholder = def.titlePh;
    fDetail.value = editing ? (editing.detail || "") : "";
    fDetail.placeholder = def.detailPh;
    if (def.statusOptions.length) {
      fStatusWrap.classList.remove("hidden");
      fStatus.innerHTML = def.statusOptions.map(function (s) {
        return '<option value="' + esc(s) + '">' + esc(s) + "</option>";
      }).join("");
      fStatus.value = editing ? (editing.status || def.statusOptions[0]) : def.statusOptions[0];
    } else {
      fStatusWrap.classList.add("hidden");
    }
    fValueWrap.classList.remove("hidden");
    fValueLabel.textContent = def.valueLabel;
    fValue.placeholder = kind === "link" ? "https://…" : def.valueLabel;
    fValue.value = editing ? (editing.value || "") : "";
    modal.classList.remove("hidden");
    setTimeout(function () { fTitle.focus(); }, 30);
  }
  function closeModal() {
    modal.classList.add("hidden");
    editing = null;
    currentKind = null;
  }

  itemForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!configured) { setMsg(dashMsg, "后端未配置，无法保存。"); return; }
    if (!user) return;
    var payload = {
      title: fTitle.value.trim(),
      detail: fDetail.value.trim(),
      value: fValue.value.trim(),
      status: fStatusWrap.classList.contains("hidden") ? "" : fStatus.value,
      sort: 0
    };
    if (!payload.title) { fTitle.focus(); return; }
    modalSave.disabled = true;
    var op;
    if (editing && editing.id) {
      op = client.from("workbench_items").update(payload).eq("id", editing.id);
    } else {
      payload.kind = currentKind;
      payload.user_id = user.id;
      op = client.from("workbench_items").insert(payload);
    }
    op.then(function (res) {
      modalSave.disabled = false;
      if (res.error) {
        setMsg(dashMsg, (editing ? "更新" : "保存") + "失败：" + (res.error.message || "未知错误"));
        return;
      }
      var reloadKind = currentKind;
      closeModal();
      setMsg(dashMsg, "");
      loadKind(reloadKind);
    }).catch(function (err) {
      modalSave.disabled = false;
      setMsg(dashMsg, (editing ? "更新" : "保存") + "失败：" + (err && err.message ? err.message : "网络错误"));
    });
  });

  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });

  /* ===== 列表事件委托（新增 / 编辑 / 删除） ===== */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var add = t.closest ? t.closest(".btn-add") : null;
    if (add) {
      if (!configured) { setMsg(dashMsg, "后端未配置，无法新增。"); return; }
      if (!user) return;
      openModal(add.getAttribute("data-kind"));
      return;
    }
    var row = t.closest ? t.closest(".row") : null;
    if (!row) return;
    var kind = row.getAttribute("data-kind");
    var id = row.getAttribute("data-id");
    if (t.closest(".row-del")) {
      if (!configured) { setMsg(dashMsg, "后端未配置，无法删除。"); return; }
      if (!window.confirm("确定删除这条记录？此操作不可恢复。")) return;
      client.from("workbench_items").delete().eq("id", id).then(function (res) {
        if (res.error) { setMsg(dashMsg, "删除失败：" + (res.error.message || "未知错误")); return; }
        setMsg(dashMsg, "");
        loadKind(kind);
      }).catch(function (err) {
        setMsg(dashMsg, "删除失败：" + (err && err.message ? err.message : "网络错误"));
      });
      return;
    }
    if (t.closest(".row-edit")) {
      if (!configured) { setMsg(dashMsg, "后端未配置，无法编辑。"); return; }
      var rec = findRecord(kind, id);
      if (rec) openModal(kind, rec);
    }
  });

  /* ===== 登录 / 登出 ===== */
  function bindAuth(client) {
    client.auth.getSession().then(function (res) {
      if (res && res.data && res.data.session) showDash(res.data.session.user);
    }).catch(function () {});

    client.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_IN" && session) showDash(session.user);
      else if (event === "SIGNED_OUT") showLogin("");
    });

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      setMsg(loginMsg, "");
      loginBtn.disabled = true;
      client.auth.signInWithPassword({ email: email, password: password })
        .then(function (res) {
          loginBtn.disabled = false;
          if (res.error) {
            setMsg(loginMsg, res.error.message || "登录失败，请检查邮箱与密码。");
            return;
          }
          showDash(res.data.user);
        })
        .catch(function (err) {
          loginBtn.disabled = false;
          setMsg(loginMsg, err && err.message ? err.message : "登录失败，请稍后重试。");
        });
    });

    logoutBtn.addEventListener("click", function () {
      client.auth.signOut().catch(function () {});
    });
  }

  /* ===== 启动 ===== */
  initTheme();
  themeBtnLogin.addEventListener("click", toggleTheme);
  themeBtnDash.addEventListener("click", toggleTheme);
  disableCrud(true); /* 默认置灰，配置就绪且登录后由 showDash 恢复 */

  if (!configured) {
    configHint.textContent = "后端配置未就绪：请提供 Supabase 项目 URL 与 anon key（assets/js/workbench-app.js）后启用登录。";
    loginBtn.disabled = true;
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  bindAuth(client);
})();
