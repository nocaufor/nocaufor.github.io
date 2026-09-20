/* 单位换算器：页面在线演示逻辑
   因子表驱动的线性换算 + 温度仿射换算，全部在浏览器本地计算 */
(function () {
  "use strict";

  /* 与工程区 units.json 一致：线性类别给出相对基准单位的因子，温度给出仿射参数 */
  var DATA = {
    length: { label: "长度", base: "m", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mile: 1609.344, nmi: 1852 } },
    mass: { label: "质量", base: "kg", units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 } },
    data: { label: "数据量", base: "B", units: { bit: 0.125, B: 1, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776, KB: 1000, MB: 1e6, GB: 1e9, TB: 1e12 } },
    time: { label: "时间", base: "s", units: { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800 } },
    temperature: { label: "温度", base: "C", affine: { C: { scale: 1, offset: 0 }, F: { scale: 5 / 9, offset: -32 }, K: { scale: 1, offset: -273.15 } } }
  };

  function $(id) { return document.getElementById(id); }
  function keys(cat) { return Object.keys(DATA[cat].units || DATA[cat].affine); }
  function unitsOf(cat) { return DATA[cat].units || DATA[cat].affine; }

  function toBase(v, u, cat) {
    var c = DATA[cat];
    if (c.affine) return (v + c.affine[u].offset) * c.affine[u].scale;
    return v * c.units[u];
  }
  function fromBase(v, u, cat) {
    var c = DATA[cat];
    if (c.affine) return v / c.affine[u].scale - c.affine[u].offset;
    return v / c.units[u];
  }

  /* 12 位有效数字后去尾零，避免 1 km = 0.6213711922373341 mile 这类浮点噪声 */
  function fmt(x) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    var s = x.toPrecision(12);
    if (s.indexOf("e") < 0) s = String(parseFloat(s));
    return s;
  }

  function factorNote(src, dst, cat) {
    var c = DATA[cat];
    if (c.affine) return "仿射：" + src + " → " + dst;
    return "1 " + src + " = " + fmt(c.units[src] / c.units[dst]) + " " + dst;
  }

  function fillUnits() {
    var cat = $("uc-cat").value, ks = keys(cat);
    var opts = ks.map(function (k) { return '<option value="' + k + '">' + k + "</option>"; }).join("");
    $("uc-from").innerHTML = opts;
    $("uc-to").innerHTML = opts;
    $("uc-from").value = ks[0];
    $("uc-to").value = ks[Math.min(ks.length - 1, cat === "temperature" ? 1 : 3)];
    $("uc-val").value = cat === "temperature" ? 100 : 100;
  }

  function run() {
    var cat = $("uc-cat").value, v = parseFloat($("uc-val").value);
    var src = $("uc-from").value, dst = $("uc-to").value;
    if (!isFinite(v)) { $("uc-status").textContent = "请输入有效数值（支持小数与负数，例如 -40）。"; return; }
    var base = toBase(v, src, cat), out = fromBase(base, dst, cat);
    $("uc-k-value").textContent = fmt(out) + " " + dst;
    $("uc-k-factor").textContent = factorNote(src, dst, cat);
    $("uc-k-formula").textContent = DATA[cat].affine ? "仿射公式" : "因子相除";
    $("uc-out").innerHTML =
      "<div><b>" + fmt(v) + " " + src + " = " + fmt(out) + " " + dst + "</b></div>" +
      "<div style=\"margin-top:6px\">中间量（基准单位 " + DATA[cat].base + "）：" + fmt(base) + " " + DATA[cat].base + "</div>" +
      "<div style=\"margin-top:6px\">换算链：先归一到基准单位，再除以目标单位因子 —— 与工程区 <code>convert.py</code> 中的 <code>to_base()/from_base()</code> 完全一致。</div>";
    $("uc-status").textContent = "已按 " + DATA[cat].label + " 类别换算：" + fmt(v) + " " + src + " → " + fmt(out) + " " + dst + "。";
  }

  function table() {
    var cat = $("uc-cat").value, from = $("uc-from").value, ks = keys(cat);
    var rows = ks.map(function (k) {
      var out = fromBase(toBase(1, from, cat), k, cat);
      return "<tr><td>1 " + from + " → " + k + "</td><td class=\"demo-mono\">" + fmt(out) + "</td></tr>";
    }).join("");
    $("uc-tblwrap").style.display = "";
    $("uc-tblwrap").innerHTML = '<div class="code-card"><p>以 <code>1 ' + from + '</code> 为基准的 ' + DATA[cat].label +
      '换算表（共 ' + ks.length + ' 个单位）：</p><table class="demo-table" id="uc-tbl"><thead><tr><th>换算</th><th>结果</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>";
    $("uc-status").textContent = "已生成 " + DATA[cat].label + " 类别以 1 " + from + " 为基准的换算表（" + ks.length + " 行）。";
  }

  function init() {
    if (!$("uc-cat")) return;
    $("uc-cat").innerHTML = Object.keys(DATA).map(function (k) { return '<option value="' + k + '">' + DATA[k].label + "（" + k + "）</option>"; }).join("");
    fillUnits();
    $("uc-cat").addEventListener("change", function () { fillUnits(); run(); });
    $("uc-run").addEventListener("click", run);
    $("uc-swap").addEventListener("click", function () {
      var a = $("uc-from").value; $("uc-from").value = $("uc-to").value; $("uc-to").value = a; run();
    });
    $("uc-table").addEventListener("click", table);
    $("uc-val").addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
