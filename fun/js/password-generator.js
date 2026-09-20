/* 强随机密码生成与强度评估：页面在线演示逻辑
   使用 crypto.getRandomValues 取随机数，密码与检测文本均不离开设备 */
(function () {
  "use strict";

  var SETS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digit: "0123456789",
    symbol: "!@#$%^&*()-_=+[]{};:,.<>?"
  };
  var SIMILAR = "0O1lI|";                 /* 易混字符：数字 0、字母 O、小写 l、大写 I、竖线 */
  var GUESS_PER_SEC = 1e10;              /* 离线爆破估算：单机每秒 100 亿次 */
  var last = [];

  function $(id) { return document.getElementById(id); }

  /* 无偏取模：拒绝采样，避免 a % n 造成的轻微偏置 */
  function randInt(n) {
    var a = new Uint32Array(1), limit = Math.floor(4294967296 / n) * n;
    do { crypto.getRandomValues(a); } while (a[0] >= limit);
    return a[0] % n;
  }

  function pool(keys, noSimilar) {
    var s = keys.map(function (k) { return SETS[k]; }).join("");
    if (noSimilar) {
      s = s.split("").filter(function (c) { return SIMILAR.indexOf(c) < 0; }).join("");
    }
    return s;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = randInt(i + 1), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function generate(length, keys, noSimilar) {
    var p = pool(keys, noSimilar);
    if (!p) throw new Error("请至少勾选一种字符集");
    var out = [], i;
    /* 每个被选字符集至少出现一次，保证策略真实生效 */
    keys.forEach(function (k) {
      var sub = noSimilar ? pool([k], true) : SETS[k];
      if (sub) out.push(sub.charAt(randInt(sub.length)));
    });
    for (i = out.length; i < length; i++) out.push(p.charAt(randInt(p.length)));
    return shuffle(out).slice(0, length).join("");
  }

  function ratio(pw) {                    /* 依据密码实际包含的字符类别估算字符池大小 */
    var size = 0;
    if (/[a-z]/.test(pw)) size += 26;
    if (/[A-Z]/.test(pw)) size += 26;
    if (/[0-9]/.test(pw)) size += 10;
    if (/[^a-zA-Z0-9]/.test(pw)) size += 33;
    return size || 1;
  }

  function entropy(pw) { return pw.length * Math.log2(ratio(pw)); }

  function level(bits) {
    if (bits < 28) return { name: "很弱", cls: "warn", pct: Math.max(6, bits / 28 * 18) };
    if (bits < 50) return { name: "中等", cls: "info", pct: 45 };
    if (bits < 70) return { name: "强", cls: "ok", pct: 72 };
    return { name: "极强", cls: "ok", pct: 100 };
  }

  function crack(bits) {
    if (!isFinite(bits) || bits <= 0) return "—";
    var sec = Math.pow(2, bits) / GUESS_PER_SEC;      /* 期望半程熵，量级估算 */
    var units = [[3155760000, "年"], [86400, "天"], [3600, "小时"], [60, "分钟"], [1, "秒"]];
    if (sec > 3155760000 * 1e6) return "10^" + Math.round(Math.log10(sec / 3155760000)) + " 年";
    for (var i = 0; i < units.length; i++) {
      if (sec >= units[i][0]) return (sec / units[i][0] >= 100 ? Math.round(sec / units[i][0]) : (sec / units[i][0]).toFixed(1)) + " " + units[i][1];
    }
    return "瞬时";
  }

  function advice(pw) {
    var tips = [], keys = [];
    ["lower", "upper", "digit", "symbol"].forEach(function (k) {
      var re = { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^a-zA-Z0-9]/ }[k];
      if (re.test(pw)) keys.push(k);
    });
    if (pw.length < 12) tips.push("长度不足 12 位，建议至少 16 位（长度是熵值贡献最大的因素）");
    if (keys.length < 3) tips.push("只用了 " + keys.length + " 类字符，建议大小写字母 + 数字 + 符号混合");
    if (/(.)\1{2,}/.test(pw)) tips.push("存在连续重复字符（如 aaa），会被爆破工具优先尝试");
    if (/^(123|abc|qwerty|password|admin|iloveyou|888|666)/i.test(pw) || /(password|admin|qwerty|520|1314)/i.test(pw)) {
      tips.push("命中常见弱口令/键盘序模式词库，实际强度远低于熵值估算");
    }
    if (/(19|20)\d{2}/.test(pw)) tips.push("包含年份样式数字（如 1998、2024），属于字典高频组合");
    if (!tips.length) tips.push("未发现明显弱点：长度、字符集与随机性均达标，建议配合独立密码管理器保管");
    return tips;
  }

  function copy(text, statusEl) {
    function done(ok) {
      if (statusEl) statusEl.textContent = ok ? "已复制到剪贴板：" + text.slice(0, 24) + (text.length > 24 ? "…" : "") : "复制失败，请手动选中复制。";
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        done(ok);
      } catch (e) { done(false); }
    }
  }

  function readOptions() {
    var keys = [];
    if ($("pg-lower").checked) keys.push("lower");
    if ($("pg-upper").checked) keys.push("upper");
    if ($("pg-digit").checked) keys.push("digit");
    if ($("pg-symbol").checked) keys.push("symbol");
    return { len: parseInt($("pg-len").value, 10), keys: keys, noSimilar: $("pg-nosimilar").checked };
  }

  function render() {
    var out = $("pg-out");
    var html = last.map(function (pw) {
      var b = entropy(pw), lv = level(b);
      return '<div class="pw-item" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:7px 0;border-bottom:1px solid var(--line)">' +
        '<code class="demo-mono" style="flex:1;min-width:220px">' + pw.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</code>" +
        '<span class="demo-chip ' + lv.cls + '">' + Math.round(b) + " bit · " + lv.name + "</span>" +
        '<button type="button" class="btn btn-outline" data-pw="' + pw.replace(/"/g, "&quot;") + '">复制</button></div>';
    }).join("");
    out.innerHTML = html || "";
  }

  function runGen() {
    var o = readOptions();
    if (!o.keys.length) { $("pg-gen-status").textContent = "请至少勾选一种字符集（大写 / 小写 / 数字 / 符号）。"; return; }
    var n = parseInt($("pg-count").value, 10) || 1;
    last = [];
    for (var i = 0; i < n; i++) last.push(generate(o.len, o.keys, o.noSimilar));
    render();
    var bits = entropy(last[0]), lv = level(bits);
    $("pg-gen-status").textContent = "已生成 " + n + " 条 " + o.len + " 位密码（字符池 " + pool(o.keys, o.noSimilar).length +
      " 个字符" + (o.noSimilar ? "，已排除易混字符 " + SIMILAR : "") + "）；首条熵值约 " + Math.round(bits) + " bit，等级： " + lv.name + "。点击任一条右侧“复制”即可取用。";
  }

  function runTest() {
    var pw = $("pg-test").value;
    var bits = pw ? entropy(pw) : 0, lv = level(bits);
    $("pg-entropy").textContent = pw ? Math.round(bits) : "0";
    $("pg-level").textContent = pw ? lv.name : "—";
    $("pg-crack").textContent = pw ? crack(bits) : "—";
    $("pg-bar").style.width = (pw ? Math.min(100, lv.pct) : 0) + "%";
    $("pg-advice").innerHTML = pw
      ? "<ul style=\"margin:6px 0 0 18px\">" + advice(pw).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>"
      : "等待输入：在检测框内粘贴任意密码，即时给出熵值、等级与离线爆破时间估算。";
  }

  function init() {
    if (!$("pg-gen")) return;
    $("pg-len").addEventListener("input", function () { $("pg-len-val").textContent = this.value; });
    $("pg-gen").addEventListener("click", runGen);
    $("pg-copy").addEventListener("click", function () {
      if (!last.length) { $("pg-gen-status").textContent = "请先生成密码，再复制。"; return; }
      copy(last[0], $("pg-gen-status"));
    });
    $("pg-out").addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-pw")) copy(t.getAttribute("data-pw"), $("pg-gen-status"));
    });
    $("pg-test").addEventListener("input", runTest);
    runGen();
    runTest();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
