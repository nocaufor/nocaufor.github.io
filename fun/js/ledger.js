/* nocau Fun 个人记账与预算洞察（源自想法 B000008，CSP 兼容） */
(function () {
  "use strict";

  var KEY = "ncLedgerV1";
  var CATS = { expense: ["餐饮", "交通", "居住", "购物", "娱乐", "医疗", "其他"], income: ["工资", "奖金", "理财", "兼职", "其他"] };
  var catEl = document.getElementById("l-cat");
  var typeEl = document.getElementById("l-type");
  var dateEl = document.getElementById("l-date");
  var amountEl = document.getElementById("l-amount");
  var noteEl = document.getElementById("l-note");
  var bodyEl = document.getElementById("l-body");
  var budgetEl = document.getElementById("l-budget");
  var incEl = document.getElementById("l-inc");
  var expEl = document.getElementById("l-exp");
  var balEl = document.getElementById("l-bal");
  var barEl = document.getElementById("l-bar");
  var budgetTxtEl = document.getElementById("l-budget-txt");
  if (!bodyEl) return;

  var records = [];
  try { records = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { records = []; }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function fillCats() {
    catEl.innerHTML = "";
    CATS[typeEl.value].forEach(function (c) {
      var op = document.createElement("option");
      op.textContent = c;
      op.value = c;
      catEl.appendChild(op);
    });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(records)); } catch (e) {}
  }

  function fmt(n) { return Number(n).toFixed(2); }

  function render() {
    records.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var month = today().slice(0, 7);
    var inc = 0, exp = 0;
    bodyEl.innerHTML = "";
    records.forEach(function (r, idx) {
      if (r.date.slice(0, 7) === month) {
        if (r.type === "income") inc += Number(r.amount); else exp += Number(r.amount);
      }
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + r.date + "</td><td>" + (r.type === "income" ? "收入" : "支出") + "</td><td>" + r.cat + "</td><td>" + fmt(r.amount) + "</td><td>" + (r.note || "") + "</td>";
      var td = document.createElement("td");
      var del = document.createElement("span");
      del.textContent = "✕";
      del.style.cursor = "pointer";
      del.style.opacity = ".5";
      del.addEventListener("click", function () { records.splice(idx, 1); save(); render(); });
      td.appendChild(del);
      tr.appendChild(td);
      bodyEl.appendChild(tr);
    });
    incEl.textContent = fmt(inc);
    expEl.textContent = fmt(exp);
    balEl.textContent = fmt(inc - exp);
    var budget = parseFloat(budgetEl.value) || 0;
    var pct = budget > 0 ? Math.min(exp / budget * 100, 100) : 0;
    barEl.style.width = pct + "%";
    if (exp > budget) { barEl.style.background = "#e06c75"; budgetTxtEl.textContent = "已超预算 " + fmt(exp - budget) + " 元"; }
    else { barEl.style.background = "#7aa2f7"; budgetTxtEl.textContent = "预算剩余 " + fmt(budget - exp) + " 元"; }
  }

  function add() {
    var amount = parseFloat(amountEl.value);
    if (!(amount > 0)) { amountEl.focus(); return; }
    records.push({ date: dateEl.value || today(), type: typeEl.value, cat: catEl.value, amount: amount, note: noteEl.value.trim() });
    save();
    amountEl.value = "";
    noteEl.value = "";
    render();
  }

  typeEl.addEventListener("change", fillCats);
  document.getElementById("l-add").addEventListener("click", add);
  budgetEl.addEventListener("change", render);
  document.getElementById("l-clear").addEventListener("click", function () {
    if (records.length && confirm("确认清空全部记账记录？")) { records = []; save(); render(); }
  });
  document.getElementById("l-sample").addEventListener("click", function () {
    var days = 0;
    var d = new Date();
    function dstr(off) { var x = new Date(d.getTime() - off * 86400000); return x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); }
    records = [
      { date: dstr(1), type: "income", cat: "工资", amount: 12000, note: "8 月工资" },
      { date: dstr(2), type: "expense", cat: "餐饮", amount: 46.5, note: "午餐" },
      { date: dstr(3), type: "expense", cat: "交通", amount: 12, note: "地铁" },
      { date: dstr(4), type: "expense", cat: "居住", amount: 2200, note: "房租" },
      { date: dstr(5), type: "expense", cat: "购物", amount: 399, note: "键盘" },
      { date: dstr(6), type: "expense", cat: "娱乐", amount: 88, note: "电影" }
    ];
    save(); render();
  });

  if (!dateEl.value) dateEl.value = today();
  fillCats();
  render();
})();
