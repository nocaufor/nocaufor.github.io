/* miniapp-login.js：在线演示 —— 登录链路（模拟 wx.login / code2session / token 签发校验）
   与支付安全（统一下单签名 / 回调验签 / 金额核对）
   演示用 Web Crypto（SHA-256 / HMAC），签名规则与工程 server/auth.js、server/pay.js 一致（CSP 兼容，无内联） */
(function () {
  "use strict";

  /* ⚠️ 仅演示密钥，禁止用于生产：此值仅为在线示例（DEMO）伪造 JWT 使用，
     生产环境必须由 server/auth.js 读取独立随机密钥（.env 配置），严禁复用本值或注释声称的约定。 */
  var DEMO_SECRET = "nocau-demo-jwt-secret-2026";
  var API_V2_KEY = "NOCAU-DEMO-APIv2-KEY-0123456789";
  var APPID = "wx_demo_appid";
  var MCH_ID = "1900000000";

  var token = null;          /* 当前签发 token */
  var orderParams = null;    /* 最近一次下单参数（含 sign） */

  function $(id) { return document.getElementById(id); }
  function enc(s) { return new TextEncoder().encode(String(s)); }
  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function bytesToB64url(buf) {
    var s = btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
    return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function sha256Hex(s) {
    return crypto.subtle.digest("SHA-256", enc(s)).then(bytesToHex);
  }
  function hmacB64url(data, key) {
    return crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then(function (k) { return crypto.subtle.sign("HMAC", k, enc(data)); })
      .then(bytesToB64url);
  }

  /* token：base64url(payload) + "." + HMAC(payload) —— 与 server/auth.js 一致 */
  function issueToken(openid, ttlMs) {
    var part = bytesToB64url(enc(JSON.stringify({ openid: openid, exp: Date.now() + ttlMs })));
    return hmacB64url(part, DEMO_SECRET).then(function (sig) { return part + "." + sig; });
  }
  function verifyToken(tok) {
    var parts = String(tok || "").split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return Promise.reject(new Error("token 格式错误"));
    return hmacB64url(parts[0], DEMO_SECRET).then(function (sig) {
      if (sig !== parts[1]) throw new Error("token 签名不匹配（可能被篡改）");
      var data = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
      if (!data.exp || data.exp < Date.now()) throw new Error("token 已过期");
      return data;
    });
  }

  /* 支付 v2 签名规则：剔除 sign/空值 → key 升序 → &key= → 哈希（演示 SHA-256，生产 MD5） */
  function buildSignString(params, key) {
    var parts = Object.keys(params)
      .filter(function (k) { return k !== "sign" && params[k] !== undefined && params[k] !== null && params[k] !== ""; })
      .sort()
      .map(function (k) { return k + "=" + params[k]; });
    return parts.join("&") + "&key=" + key;
  }
  function sign(params, key) { return sha256Hex(buildSignString(params, key)); }

  function log(text) {
    var box = $("ml-log");
    if (!box) return;
    var line = document.createElement("div");
    line.textContent = "· " + text;
    box.insertBefore(line, box.firstChild);
    while (box.children.length > 8) box.removeChild(box.lastChild);
  }
  function setStatus(text) { var el = $("ml-status"); if (el) el.textContent = text; }
  function setTokenStatus(text, ok) {
    var el = $("ml-token-status");
    if (!el) return;
    el.textContent = text;
    el.style.color = ok ? "var(--ok)" : "var(--danger)";
  }

  function randomHex(len) {
    var arr = new Uint8Array(len / 2 || 4);
    crypto.getRandomValues(arr);
    return Array.prototype.map.call(arr, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }

  function init() {
    if (!$("ml-demo")) return;

    $("ml-login").addEventListener("click", function () {
      var code = "code_" + randomHex(8);
      var openid = "o_demo_" + randomHex(6);
      log("wx.login 成功 → 临时 code：" + code);
      log("后端 code2session 换 openid/session_key（session_key 永不下发前端）");
      issueToken(openid, 7 * 86400000).then(function (t) {
        token = t;
        $("ml-openid").textContent = openid;
        setTokenStatus("已登录（token 已签发）", true);
        setStatus("登录成功：token 已保存在演示内存中，可点 ② 校验、③ 篡改、④ 过期。");
        log("签发业务 token：" + t.slice(0, 46) + "…");
      });
    });

    $("ml-verify").addEventListener("click", function () {
      if (!token) { setTokenStatus("未登录", false); setStatus("请先点 ① 模拟登录。"); return; }
      verifyToken(token).then(function (data) {
        setTokenStatus("校验通过（openid: " + data.openid + "）", true);
        setStatus("token 校验通过，服务端解析出 openid 与有效期。");
        log("verifyToken → OK：" + data.openid + "，exp=" + new Date(data.exp).toLocaleString());
      }).catch(function (e) {
        setTokenStatus("校验失败：" + e.message, false);
        setStatus("token 校验失败：" + e.message);
        log("verifyToken → 拒绝：" + e.message);
      });
    });

    $("ml-tamper").addEventListener("click", function () {
      if (!token) { setTokenStatus("未登录", false); setStatus("请先点 ① 模拟登录。"); return; }
      var bad = token.slice(0, -2) + (token.slice(-2) === "AA" ? "BB" : "AA");
      verifyToken(bad).then(function () {
        setTokenStatus("异常：篡改 token 竟然通过", false);
        setStatus("异常：篡改 token 竟然通过（实现有误）");
      }).catch(function (e) {
        setTokenStatus("已拒绝（" + e.message + "）", false);
        setStatus("篡改 token 被服务端拒绝：" + e.message);
        log("篡改后 verifyToken → 拒绝：" + e.message);
      });
    });

    $("ml-expire").addEventListener("click", function () {
      issueToken("o_demo_expired", -1000).then(function (t) {
        verifyToken(t).then(function () {
          setTokenStatus("异常：过期 token 竟然通过", false);
          setStatus("异常：过期 token 竟然通过（实现有误）");
        }).catch(function (e) {
          setTokenStatus("已拒绝（" + e.message + "）", false);
          setStatus("过期 token 被服务端拒绝：" + e.message);
          log("过期 token → 拒绝：" + e.message);
        });
      });
    });

    $("ml-sign").addEventListener("click", function () {
      var oidEl = $("ml-openid");
      var params = {
        appid: APPID,
        mch_id: MCH_ID,
        nonce_str: randomHex(16),
        body: "演示商品",
        out_trade_no: "NC" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + randomHex(3),
        total_fee: 1990,
        spbill_create_ip: "127.0.0.1",
        notify_url: "https://example.com/notify",
        trade_type: "JSAPI",
        openid: oidEl && oidEl.textContent.indexOf("o_demo") === 0 ? oidEl.textContent : "o_demo_mock"
      };
      sign(params, API_V2_KEY).then(function (s) {
        params.sign = s.toUpperCase();
        orderParams = params;
        setStatus("统一下单参数已生成，sign（演示 SHA-256，规则同 v2 MD5）=" + s.toUpperCase().slice(0, 16) + "…");
        log("统一下单 → out_trade_no=" + params.out_trade_no + "，total_fee=" + params.total_fee + "，sign=" + s.toUpperCase().slice(0, 32));
      });
    });

    function forgedCallback(mutate) {
      if (!orderParams) { setStatus("请先点 ⑤ 生成下单签名。"); return; }
      var cb = {
        out_trade_no: orderParams.out_trade_no,
        total_fee: orderParams.total_fee,
        result_code: "SUCCESS",
        transaction_id: "420000" + randomHex(14),
        appid: orderParams.appid,
        mch_id: orderParams.mch_id,
        nonce_str: randomHex(16)
      };
      if (mutate) cb.total_fee = orderParams.total_fee + 1;
      var fakeKey = "ATTACKER-KNOWS-NOTHING-0123456789";
      var signKey = mutate ? API_V2_KEY : fakeKey; /* ⑦ 模拟拿到合法签名但篡改金额，专测金额核对防线 */
      sign(cb, signKey).then(function (s) {
        cb.sign = s.toUpperCase();
        return sign(cb, API_V2_KEY).then(function (expect) {
          var sigOk = expect.toUpperCase() === String(cb.sign).toUpperCase();
          if (!sigOk) {
            setStatus("伪造回调已拦截：签名不匹配（攻击者不知道 APIv2 密钥）");
            log("伪造回调（假密钥签名）→ 验签失败，拒绝发货");
            return;
          }
          if (Number(cb.total_fee) !== Number(orderParams.total_fee)) {
            setStatus("伪造回调已拦截：签名虽匹配，但金额不匹配（checkAmount 防线）");
            log("伪造回调（改金额）→ checkAmount 金额不匹配，拒绝发货");
            return;
          }
          setStatus("回调通过（仅当签名与金额都匹配才发货）");
          log("回调验签通过 → 发货");
        });
      });
    }
    $("ml-forge").addEventListener("click", function () { forgedCallback(false); });
    $("ml-forge-amt").addEventListener("click", function () { forgedCallback(true); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
