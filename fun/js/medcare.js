/* nocau Fun 家庭用药与健康档案（源自想法 B000004，CSP 兼容） */
(function () {
  "use strict";

  var KEY = "ncMedcareV1";
  var tabEls = document.querySelectorAll(".m-tab");
  var memberEl = document.getElementById("m-member");
  var medListEl = document.getElementById("m-med-list");
  var vListEl = document.getElementById("v-list");
  var pListEl = document.getElementById("p-list");
  if (!medListEl) return;

  var data = { meds: [], vitals: [], profiles: [] };
  try { data = JSON.parse(localStorage.getItem(KEY) || "null") || data; } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  function fillMembers() {
    memberEl.innerHTML = "";
    data.profiles.forEach(function (p) {
      var op = document.createElement("option");
      op.value = p.name;
      op.textContent = p.name + (p.age ? "（" + p.age + " 岁）" : "");
      memberEl.appendChild(op);
    });
    if (!data.profiles.length) {
      var op0 = document.createElement("option");
      op0.value = "本人";
      op0.textContent = "本人";
      memberEl.appendChild(op0);
    }
  }

  function render() {
    fillMembers();
    // 用药列表
    medListEl.innerHTML = "";
    data.meds.forEach(function (m, i) {
      var item = document.createElement("div");
      item.className = "m-item";
      var left = document.createElement("div");
      var t = document.createElement("span");
      t.className = "t";
      t.textContent = m.name + " · " + m.member;
      var s = document.createElement("div");
      s.className = "s";
      s.textContent = m.dose + " · " + m.time + " · " + (m.taken ? "已服用" : "待服用");
      left.appendChild(t);
      left.appendChild(s);
      var right = document.createElement("div");
      var del = document.createElement("span");
      del.className = "del";
      del.textContent = "✕ 删除";
      del.addEventListener("click", function () { data.meds.splice(i, 1); save(); render(); });
      right.appendChild(del);
      item.appendChild(left);
      item.appendChild(right);
      medListEl.appendChild(item);
    });
    // 体征列表（倒序）
    vListEl.innerHTML = "";
    var lastBp = "—", lastGlu = "—";
    data.vitals.slice().reverse().forEach(function (v, i) {
      var isBp = v.type === "bp";
      var label = isBp ? "血压" : "血糖";
      var val = isBp ? (v.sys + "/" + (v.dia || "-")) : (v.sys + " mmol/L");
      if (i === 0) { if (isBp) lastBp = val; else lastGlu = val; }
      var item = document.createElement("div");
      item.className = "m-item";
      item.innerHTML = "<div><span class=\"t\">" + label + " " + val + "</span><div class=\"s\">" + v.date + "</div></div><span class=\"del\" data-idx=\"" + i + "\">✕</span>";
      item.querySelector(".del").addEventListener("click", function () {
        var ridx = data.vitals.length - 1 - i;
        data.vitals.splice(ridx, 1); save(); render();
      });
      vListEl.appendChild(item);
    });
    document.getElementById("v-last-bp").textContent = lastBp;
    document.getElementById("v-last-glu").textContent = lastGlu;
    document.getElementById("v-count").textContent = data.vitals.length;
    // 档案列表
    pListEl.innerHTML = "";
    data.profiles.forEach(function (p, i) {
      var item = document.createElement("div");
      item.className = "m-item";
      item.innerHTML = "<div><span class=\"t\">" + p.name + " · " + p.age + " 岁 · " + p.blood + " 型</span><div class=\"s\">过敏史：" + (p.allergy || "无") + "</div></div><span class=\"del\">✕</span>";
      item.querySelector(".del").addEventListener("click", function () { data.profiles.splice(i, 1); save(); render(); });
      pListEl.appendChild(item);
    });
  }

  tabEls.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabEls.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      document.querySelectorAll(".m-pane").forEach(function (p) { p.classList.remove("active"); });
      document.querySelector('[data-pane="' + tab.dataset.tab + '"]').classList.add("active");
    });
  });

  document.getElementById("m-add").addEventListener("click", function () {
    var name = document.getElementById("m-name").value.trim();
    var dose = document.getElementById("m-dose").value.trim();
    var time = document.getElementById("m-time").value || "08:00";
    if (!name) return;
    data.meds.push({ member: memberEl.value, name: name, dose: dose || "1 次/天", time: time, taken: false });
    save(); render();
    document.getElementById("m-name").value = "";
    document.getElementById("m-dose").value = "";
  });

  document.getElementById("v-add").addEventListener("click", function () {
    var type = document.getElementById("v-type").value;
    var sys = parseFloat(document.getElementById("v-sys").value);
    if (!(sys > 0)) return;
    var dia = parseFloat(document.getElementById("v-dia").value) || 0;
    data.vitals.push({ type: type, sys: sys, dia: dia, date: document.getElementById("v-date").value || today() });
    save(); render();
    document.getElementById("v-sys").value = "";
    document.getElementById("v-dia").value = "";
  });

  document.getElementById("p-add").addEventListener("click", function () {
    var name = document.getElementById("p-name").value.trim();
    if (!name) return;
    data.profiles.push({
      name: name,
      age: document.getElementById("p-age").value || "",
      blood: document.getElementById("p-blood").value,
      allergy: document.getElementById("p-allergy").value.trim()
    });
    save(); render();
    document.getElementById("p-name").value = "";
    document.getElementById("p-age").value = "";
    document.getElementById("p-allergy").value = "";
  });

  document.getElementById("m-sample").addEventListener("click", function () {
    data = {
      profiles: [{ name: "奶奶", age: 68, blood: "O", allergy: "青霉素" }, { name: "爸爸", age: 45, blood: "A", allergy: "" }],
      meds: [
        { member: "奶奶", name: "降压药（氨氯地平）", dose: "1 片/次", time: "08:00", taken: false },
        { member: "爸爸", name: "二甲双胍", dose: "0.5g/次", time: "12:30", taken: false }
      ],
      vitals: [
        { type: "bp", sys: 132, dia: 84, date: today() },
        { type: "glu", sys: 5.8, dia: 0, date: today() },
        { type: "bp", sys: 128, dia: 80, date: today() }
      ]
    };
    save(); render();
  });

  document.getElementById("m-clear").addEventListener("click", function () {
    if (confirm("确认清空全部健康档案数据？")) { data = { meds: [], vitals: [], profiles: [] }; save(); render(); }
  });

  if (!data.profiles.length && !data.meds.length) {
    data = {
      profiles: [{ name: "本人", age: "", blood: "A", allergy: "" }],
      meds: [], vitals: []
    };
    save();
  }
  render();
})();
