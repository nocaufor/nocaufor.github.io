/* nocau Fun 扫码点餐轻量后台（源自想法 B000006，CSP 兼容） */
(function () {
  "use strict";

  var KEY = "ncOrderingV1";
  var tabEls = document.querySelectorAll(".o-tab");
  var menuEl = document.getElementById("o-menu");
  var ordersEl = document.getElementById("o-orders");
  var statListEl = document.getElementById("o-stat-list");
  var tableSel = document.getElementById("o-table");
  var dishSel = document.getElementById("o-dish");
  if (!menuEl) return;

  var data = { dishes: [], orders: [], tables: ["A01", "A02", "A03", "B01", "B02"] };
  try { data = JSON.parse(localStorage.getItem(KEY) || "null") || data; } catch (e) {}
  var orderId = data.orders.reduce(function (m, o) { return Math.max(m, o.id || 0); }, 0) + 1;

  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  function fillTables() {
    tableSel.innerHTML = "";
    data.tables.forEach(function (t) {
      var op = document.createElement("option");
      op.value = t; op.textContent = t;
      tableSel.appendChild(op);
    });
  }

  function fillDishes() {
    dishSel.innerHTML = "";
    data.dishes.forEach(function (d) {
      var op = document.createElement("option");
      op.value = d.name; op.textContent = d.name + " ¥" + Number(d.price).toFixed(2);
      dishSel.appendChild(op);
    });
    if (!data.dishes.length) {
      var op0 = document.createElement("option");
      op0.textContent = "请先添加菜品";
      dishSel.appendChild(op0);
    }
  }

  function fmt(n) { return Number(n).toFixed(2); }

  function renderMenu() {
    menuEl.innerHTML = "";
    data.dishes.forEach(function (d, i) {
      var card = document.createElement("div");
      card.className = "o-dish" + (d.on ? " on" : "");
      var name = document.createElement("div");
      name.textContent = d.name;
      var price = document.createElement("div");
      price.className = "price";
      price.textContent = "¥" + fmt(d.price);
      var cat = document.createElement("div");
      cat.style.opacity = ".6";
      cat.style.fontSize = ".75rem";
      cat.textContent = d.cat;
      var btn = document.createElement("button");
      btn.className = "btn btn-outline";
      btn.textContent = d.on ? "在售中" : "已停售";
      btn.addEventListener("click", function () { d.on = !d.on; save(); renderMenu(); });
      var del = document.createElement("span");
      del.textContent = "✕";
      del.style.cursor = "pointer";
      del.style.opacity = ".5";
      del.style.marginLeft = "auto";
      del.addEventListener("click", function () { data.dishes.splice(i, 1); save(); renderAll(); });
      card.appendChild(name);
      card.appendChild(price);
      card.appendChild(cat);
      card.appendChild(btn);
      card.appendChild(del);
      menuEl.appendChild(card);
    });
    document.getElementById("o-dish-count").textContent = data.dishes.filter(function (d) { return d.on; }).length;
  }

  function renderOrders() {
    ordersEl.innerHTML = "";
    data.orders.slice().reverse().forEach(function (o, i) {
      var item = document.createElement("div");
      item.className = "o-order";
      var left = document.createElement("div");
      var t = document.createElement("span");
      t.className = "t";
      t.textContent = "#" + o.id + " · " + o.table + " · " + o.time;
      var items = document.createElement("div");
      items.className = "items";
      items.textContent = o.items.map(function (x) { return x.name + "×" + x.qty; }).join("、") + "  合计 ¥" + fmt(o.total);
      left.appendChild(t);
      left.appendChild(items);
      item.appendChild(left);
      var done = document.createElement("button");
      done.className = "btn btn-outline";
      done.textContent = o.done ? "已完成" : "标记完成";
      done.addEventListener("click", function () { o.done = !o.done; save(); renderOrders(); });
      item.appendChild(done);
      ordersEl.appendChild(item);
    });
  }

  function renderStats() {
    var today = new Date().toISOString().slice(0, 10);
    var todays = data.orders.filter(function (o) { return o.time.slice(0, 10) === today; });
    var total = todays.reduce(function (s, o) { return s + o.total; }, 0);
    document.getElementById("o-count").textContent = todays.length;
    document.getElementById("o-total").textContent = fmt(total);
    statListEl.innerHTML = "";
    data.orders.slice().reverse().slice(0, 20).forEach(function (o) {
      var item = document.createElement("div");
      item.className = "o-order";
      item.innerHTML = "<div><span class=\"t\">#" + o.id + " · " + o.table + " · " + o.time + "</span><div class=\"items\">" + o.items.map(function (x) { return x.name + "×" + x.qty; }).join("、") + "</div></div><b>¥" + fmt(o.total) + "</b>";
      statListEl.appendChild(item);
    });
  }

  function renderAll() {
    renderMenu();
    renderOrders();
    renderStats();
    fillTables();
    fillDishes();
  }

  tabEls.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabEls.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      document.querySelectorAll(".o-pane").forEach(function (p) { p.classList.remove("active"); });
      document.querySelector('[data-pane="' + tab.dataset.tab + '"]').classList.add("active");
    });
  });

  document.getElementById("o-add").addEventListener("click", function () {
    var name = document.getElementById("o-name").value.trim();
    var price = parseFloat(document.getElementById("o-price").value);
    var cat = document.getElementById("o-cat").value;
    if (!name || !(price >= 0)) return;
    data.dishes.push({ name: name, price: price, cat: cat, on: true });
    save(); renderAll();
    document.getElementById("o-name").value = "";
    document.getElementById("o-price").value = "";
  });

  document.getElementById("o-order").addEventListener("click", function () {
    var dish = dishSel.value;
    var qty = parseInt(document.getElementById("o-qty").value, 10) || 1;
    var d = data.dishes.filter(function (x) { return x.name === dish; })[0];
    if (!d) return;
    var d2 = new Date();
    var pad = function (n) { return ("0" + n).slice(-2); };
    var time = d2.toISOString().slice(0, 10) + " " + pad(d2.getHours()) + ":" + pad(d2.getMinutes());
    data.orders.push({ id: orderId++, table: tableSel.value, items: [{ name: d.name, qty: qty }], total: d.price * qty, time: time, done: false });
    save(); renderAll();
  });

  document.getElementById("o-sample").addEventListener("click", function () {
    data = {
      tables: ["A01", "A02", "A03", "B01", "B02"],
      dishes: [
        { name: "番茄炒蛋", price: 18, cat: "热菜", on: true },
        { name: "宫保鸡丁", price: 28, cat: "热菜", on: true },
        { name: "凉拌黄瓜", price: 12, cat: "凉菜", on: true },
        { name: "米饭", price: 2, cat: "主食", on: true },
        { name: "酸梅汤", price: 8, cat: "饮品", on: true }
      ],
      orders: [
        { id: 1, table: "A01", items: [{ name: "番茄炒蛋", qty: 1 }, { name: "米饭", qty: 2 }], total: 22, time: new Date().toISOString().slice(0, 10) + " 12:01", done: false },
        { id: 2, table: "A02", items: [{ name: "宫保鸡丁", qty: 1 }], total: 28, time: new Date().toISOString().slice(0, 10) + " 12:05", done: true }
      ]
    };
    orderId = 3;
    save(); renderAll();
  });

  document.getElementById("o-clear").addEventListener("click", function () {
    if (confirm("确认清空全部点餐数据？")) { data = { dishes: [], orders: [], tables: ["A01", "A02", "A03", "B01", "B02"] }; orderId = 1; save(); renderAll(); }
  });

  if (!data.dishes.length && !data.orders.length) {
    data = {
      tables: ["A01", "A02", "A03", "B01", "B02"],
      dishes: [], orders: []
    };
    save();
  }
  renderAll();
})();
