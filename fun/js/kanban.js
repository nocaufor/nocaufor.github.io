/* nocau Fun 极简团队任务看板（源自想法 B000015，CSP 兼容） */
(function () {
  "use strict";

  var KEY = "ncKanbanV1";
  var titleEl = document.getElementById("k-title");
  var ownerEl = document.getElementById("k-owner");
  var addBtn = document.getElementById("k-add");
  var clearBtn = document.getElementById("k-clear");
  var boardEl = document.querySelector(".k-board");
  if (!boardEl) return;

  var tasks = [];
  try { tasks = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { tasks = []; }
  var uid = tasks.reduce(function (m, t) { return Math.max(m, t.id || 0); }, 0) + 1;
  var dragId = null;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) {}
  }

  function render() {
    ["todo", "doing", "done"].forEach(function (st) {
      var list = document.querySelector('[data-list="' + st + '"]');
      var cnt = document.querySelector('[data-cnt="' + st + '"]');
      list.innerHTML = "";
      var arr = tasks.filter(function (t) { return t.status === st; });
      cnt.textContent = arr.length;
      arr.forEach(function (t) {
        var card = document.createElement("div");
        card.className = "k-card";
        card.draggable = true;
        card.dataset.id = t.id;
        var left = document.createElement("span");
        left.textContent = t.title;
        if (t.owner) {
          var own = document.createElement("span");
          own.className = "owner";
          own.textContent = " @" + t.owner;
          left.appendChild(own);
        }
        var del = document.createElement("span");
        del.className = "del";
        del.textContent = "✕";
        del.title = "删除";
        del.addEventListener("click", function () {
          tasks = tasks.filter(function (x) { return x.id !== t.id; });
          save(); render();
        });
        card.appendChild(left);
        card.appendChild(del);
        card.addEventListener("dragstart", function () { dragId = t.id; card.classList.add("dragging"); });
        card.addEventListener("dragend", function () { card.classList.remove("dragging"); dragId = null; clearHover(); });
        list.appendChild(card);
      });
    });
  }

  function clearHover() {
    boardEl.querySelectorAll(".k-col").forEach(function (c) { c.classList.remove("hover"); });
  }

  function add() {
    var title = titleEl.value.trim();
    if (!title) { titleEl.focus(); return; }
    tasks.push({ id: uid++, title: title, owner: ownerEl.value.trim(), status: "todo" });
    save();
    titleEl.value = "";
    render();
  }

  addBtn.addEventListener("click", add);
  titleEl.addEventListener("keydown", function (e) { if (e.key === "Enter") add(); });
  clearBtn.addEventListener("click", function () {
    if (tasks.length && confirm("确认清空全部任务？")) { tasks = []; save(); render(); }
  });

  boardEl.querySelectorAll(".k-col").forEach(function (col) {
    col.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("hover"); });
    col.addEventListener("dragleave", function () { col.classList.remove("hover"); });
    col.addEventListener("drop", function (e) {
      e.preventDefault();
      col.classList.remove("hover");
      if (dragId === null) return;
      var st = col.dataset.status;
      var t = tasks.filter(function (x) { return x.id === dragId; })[0];
      if (t) { t.status = st; save(); render(); }
    });
  });

  if (!tasks.length) {
    tasks = [
      { id: uid++, title: "设计首页 3D 星空", owner: "nox", status: "done" },
      { id: uid++, title: "第五批小游戏开发", owner: "nc", status: "doing" },
      { id: uid++, title: "整理想法项目落地清单", owner: "", status: "todo" },
      { id: uid++, title: "全站完整性检查", owner: "", status: "todo" }
    ];
    save();
  }
  render();
})();
