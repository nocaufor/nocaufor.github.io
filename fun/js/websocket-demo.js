/* WebSocket 演示：页面在线演示逻辑
   1) 真实 RFC6455 帧编解码（客户端帧带掩码、服务端帧不掩码），逐帧展示字节结构；
   2) 传输层用 BroadcastChannel 承载，实现「同源其他标签页实时收到」；
   3) 心跳 + 指数退避重连状态机（可点“模拟断线重连”观察退避序列）。 */
(function () {
  "use strict";

  var OPNAME = { 0: "CONTINUATION", 1: "TEXT", 2: "BINARY", 8: "CLOSE", 9: "PING", 10: "PONG" };
  var CH = "nocau-ws-demo";
  var state = "CLOSED", frames = 0, retries = 0, ch = null, beat = null, rttStart = 0, backoff = 500;
  var frameRows = [], logRows = [], PONG_MS = 15;

  function $(id) { return document.getElementById(id); }
  function now() { return new Date().toTimeString().slice(0, 8); }

  function hex(bytes, max) {
    var out = [], n = Math.min(bytes.length, max || 24);
    for (var i = 0; i < n; i++) out.push(("0" + bytes[i].toString(16)).slice(-2));
    return out.join(" ") + (bytes.length > n ? " …（共 " + bytes.length + " 字节）" : "");
  }

  function utf8(str) { return new TextEncoder().encode(str); }

  /* ---- RFC6455 帧编码：客户端（mask=true）与服务端（mask=false）复用同一函数 ---- */
  function buildFrame(opcode, payload, mask, fin) {
    var finBit = (fin === false) ? 0 : 0x80;
    var head = [finBit | (opcode & 0x0f)];
    var len = payload.length, key = null;
    if (len < 126) head.push((mask ? 0x80 : 0) | len);
    else if (len < 65536) head.push((mask ? 0x80 : 0) | 126, (len >> 8) & 0xff, len & 0xff);
    else head.push((mask ? 0x80 : 0) | 127, 0, 0, 0, 0, (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff);
    var body = payload;
    if (mask) {
      key = new Uint8Array(4);
      crypto.getRandomValues(key);
      body = new Uint8Array(payload.length);
      for (var i = 0; i < payload.length; i++) body[i] = payload[i] ^ key[i % 4];
    }
    var bytes = new Uint8Array(head.length + (key ? 4 : 0) + body.length);
    bytes.set(head, 0);
    if (key) { bytes.set(key, head.length); bytes.set(body, head.length + 4); }
    else bytes.set(body, head.length);
    return { bytes: bytes, key: key, payloadLen: len };
  }

  /* ---- RFC6455 帧解码：返回 opcode / 掩码 / 载荷 ---- */
  function parseFrame(bytes, offset) {
    offset = offset || 0;
    if (bytes.length - offset < 2) return null;
    var b0 = bytes[offset], b1 = bytes[offset + 1];
    var fin = !!(b0 & 0x80), opcode = b0 & 0x0f, masked = !!(b1 & 0x80), len = b1 & 0x7f, p = offset + 2;
    if (len === 126) { len = (bytes[p] << 8) | bytes[p + 1]; p += 2; }
    else if (len === 127) { len = 0; for (var i = 0; i < 8; i++) len = len * 256 + bytes[p + i]; p += 8; }
    var key = null;
    if (masked) { key = bytes.slice(p, p + 4); p += 4; }
    var payload = bytes.slice(p, p + len);
    if (masked) {
      var pl = new Uint8Array(payload.length);
      for (var j = 0; j < payload.length; j++) pl[j] = payload[j] ^ key[j % 4];
      payload = pl;
    }
    return { fin: fin, opcode: opcode, masked: masked, len: len, payload: payload, key: key, consumed: p + len - offset };
  }

  function pushFrame(dir, opcode, fin, masked, len, raw) {
    frames++;
    frameRows.unshift({ dir: dir, opcode: opcode, fin: fin, masked: masked, len: len, bytes: raw });
    frameRows = frameRows.slice(0, 8);
    $("ws-k-frames").textContent = frames;
    renderFrames();
  }

  function log(text) {
    logRows.unshift(now() + "  " + text);
    logRows = logRows.slice(0, 12);
    $("ws-out").innerHTML = '<pre class="ws-log">' + logRows.join("\n") + "</pre>";
  }

  function renderFrames() {
    $("ws-tblwrap").style.display = frameRows.length ? "" : "none";
    $("ws-tblwrap").innerHTML = frameRows.length
      ? '<div class="code-card"><p>最近帧字节结构（客户端帧必须掩码，服务端帧不得掩码）：</p>' +
        '<table class="demo-table" id="ws-tbl"><thead><tr><th>方向</th><th>opcode</th><th>FIN</th><th>掩码</th><th>载荷字节</th><th>前 24 字节</th></tr></thead><tbody>' +
        frameRows.map(function (r) {
          return "<tr><td>" + r.dir + "</td><td>" + r.opcode + " " + (OPNAME[r.opcode] || "?") + "</td><td>" + (r.fin ? "1" : "0") +
            "</td><td>" + (r.masked ? "有（4 字节随机掩码）" : "无") + "</td><td>" + r.len + "</td><td><code>" + hex(r.bytes) + "</code></td></tr>";
        }).join("") + "</tbody></table></div>"
      : "";
  }

  function setState(s) {
    state = s;
    $("ws-k-state").textContent = s;
  }

  function openChannel() {
    if (!("BroadcastChannel" in window)) {
      $("ws-status").textContent = "当前浏览器不支持 BroadcastChannel；可改用工程区 ws_min.py 在本机起服务端验证。";
      return;
    }
    if (ch) { ch.close(); ch = null; }
    ch = new BroadcastChannel(CH);
    ch.onmessage = function (e) {
      var raw = utf8(JSON.stringify(e.data));
      var srvFrame = buildFrame(1, raw, false);
      pushFrame("RECV", 1, true, false, raw.length, srvFrame.bytes.slice(0, 2 + Math.min(raw.length, 24)));
      log("RECV  服务端 → 客户端  " + e.data.from + "：" + e.data.text);
      if (rttStart) { $("ws-k-rtt").textContent = Math.round(performance.now() - rttStart) + " ms"; rttStart = 0; }
    };
    setState("OPEN（本地广播通道）");
    backoff = 500; retries = 0;
    $("ws-k-retry").textContent = 0;
    if (beat) clearInterval(beat);
    beat = setInterval(function () { ping(true); }, 30000);
    log("OPEN  已连接广播通道 " + CH + "（心跳 30s，断线按指数退避重连）");
  }

  /* 心跳：发 PING（客户端帧带掩码），服务端回 PONG（不带掩码） */
  function ping(silent) {
    var f = buildFrame(9, utf8("hb " + now()), true);
    var p = parseFrame(f.bytes, 0);
    pushFrame("SENT", 9, true, true, p.len, f.bytes);
    if (!silent) log("SENT  PING  掩码=" + hex(f.key, 4) + "  载荷=hb " + now());
    setTimeout(function () {
      var pong = buildFrame(10, p.payload, false);
      var pp = parseFrame(pong.bytes, 0);
      pushFrame("RECV", 10, true, false, pp.len, pong.bytes);
      log("RECV  PONG  " + new TextDecoder().decode(pp.payload) + "（心跳应答）");
    }, PONG_MS);
  }

  function send() {
    if (state.indexOf("OPEN") !== 0) {
      $("ws-status").textContent = "尚未连接：请先点“连接”（或让另一个标签页打开本页，用广播通道互发）。";
      return;
    }
    var text = $("ws-msg").value || "";
    var payload = utf8(JSON.stringify({ from: $("ws-name").value || "anonymous", text: text }));
    var f = buildFrame(1, payload, true);
    var p = parseFrame(f.bytes, 0);
    pushFrame("SENT", 1, true, true, p.len, f.bytes);
    log("SENT  TEXT  掩码=" + hex(f.key, 4) + "  载荷=" + text);
    rttStart = performance.now();
    if (ch) ch.postMessage({ from: $("ws-name").value || "anonymous", text: text });
    $("ws-status").textContent = "已发送 " + p.len + " 字节文本帧；同源其它标签页会实时收到同一条消息。";
  }

  /* 指数退避重连：500ms → 1s → 2s → 4s → 8s，最多 5 次 */
  function simulateDrop() {
    if (beat) { clearInterval(beat); beat = null; }
    setState("CLOSED");
    log("CLOSE 模拟网络中断（服务端不可达）");
    backoff = 500; retries = 0;
    var attempt = function () {
      if (retries >= 5) {
        setState("CLOSED（已达最大重连次数）");
        $("ws-status").textContent = "重连 5 次均失败：真实场景下这里应提示用户检查网络或服务端，并停止无意义重试。";
        return;
      }
      retries++;
      $("ws-k-retry").textContent = retries;
      setState("CONNECTING（第 " + retries + " 次重连）");
      log("RETRY 第 " + retries + " 次，退避 " + backoff + " ms");
      setTimeout(function () {
        if (retries >= 3) {
          openChannel();
          $("ws-status").textContent = "第 " + retries + " 次重连成功，退避序列 500ms → 1s → 2s 已完成。";
          return;
        }
        setState("CLOSED");
        backoff *= 2;
        attempt();
      }, Math.min(backoff, 200));
    };
    attempt();
  }

  function closeConn() {
    if (beat) { clearInterval(beat); beat = null; }
    var f = buildFrame(8, new Uint8Array([0x03, 0xe8]), true);   // 1000 正常关闭
    var p = parseFrame(f.bytes, 0);
    pushFrame("SENT", 8, true, true, p.len, f.bytes);
    log("SENT  CLOSE 状态码 1000（正常关闭）");
    if (ch) { ch.close(); ch = null; }
    setState("CLOSED");
    $("ws-status").textContent = "已关闭连接（发送 CLOSE 帧，状态码 1000）。";
  }

  function init() {
    if (!$("ws-send")) return;
    $("ws-connect").addEventListener("click", function () {
      $("ws-status").textContent = "已建立同源广播通道；若要连真实服务端，注意本页 CSP 为 connect-src 'self'，" +
        "跨源 ws:// 会被浏览器拦截（这是有意的安全策略），可运行工程区 ws_min.py 后按 README 在本机验证。";
      openChannel();
    });
    $("ws-send").addEventListener("click", send);
    $("ws-ping").addEventListener("click", function () { ping(false); });
    $("ws-sim").addEventListener("click", simulateDrop);
    $("ws-close").addEventListener("click", closeConn);
    $("ws-clear").addEventListener("click", function () {
      frames = 0; frameRows = []; logRows = [];
      $("ws-k-frames").textContent = "0";
      $("ws-k-retry").textContent = "0";
      $("ws-k-rtt").textContent = "- ms";
      $("ws-out").innerHTML = "";
      $("ws-tblwrap").style.display = "none";
      $("ws-status").textContent = "已清空：帧记录与日志已重置。";
    });

    /* 初始化时做一次纯本地帧层自检，便于直观看到字节结构，不发起任何网络请求 */
    var demo = buildFrame(1, utf8("hello websocket"), true);
    var parsed = parseFrame(demo.bytes, 0);
    pushFrame("SENT", 1, true, true, parsed.len, demo.bytes);
    var srv = buildFrame(1, parsed.payload, false);
    var sp = parseFrame(srv.bytes, 0);
    pushFrame("RECV", 1, true, false, sp.len, srv.bytes);
    log("SELF  帧层自检通过：编码 " + demo.bytes.length + " 字节 → 解码载荷 " + new TextDecoder().decode(sp.payload));
    log("INFO  点“连接”建立通道后可发送；点“模拟断线重连”可观察指数退避序列");
    $("ws-status").textContent = "帧层自检已通过（客户端帧带掩码、服务端帧不带掩码）。点“连接”后即可发送消息。";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
