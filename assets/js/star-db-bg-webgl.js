/* star-db-bg-webgl.js
 * 星空数据库「深空背景」WebGL2 + GLSL 全屏着色器实现。
 * - 独立外链脚本，遵守页面 CSP script-src 'self'；GLSL 源码以 JS 字符串内嵌于本文件，无内联 <script>、无外部 CDN/纹理。
 * - 挂载方式：为 star-db.html 中新增的底层 canvas#stars-bg-canvas（垫底、不可见交互）提供背景。
 * - 成功初始化后置 window.__starDbWebGLBg = true；star-db.js 检测到该标志后跳过原 2D buildBg/drawBand/FX 背景链。
 * - 初始化失败（无 WebGL2 / 编译失败）则给画布加 .stars-bg-fallback 并隐藏自身，由 star-db.js 的 2D 背景链兜底。
 */
(function () {
  "use strict";

  /* ------- 状态开关：先置 false，成功后才置 true ------- */
  window.__starDbWebGLBg = false;

  var cv = document.getElementById("stars-bg-canvas");
  if (!cv) return;

  var gl = null;
  try {
    gl = cv.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance"
    });
  } catch (e) { gl = null; }

  var reduced = false;
  try {
    reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) { reduced = false; }

  var visible = true;
  var running = false;
  var rafId = 0;

  function fail() {
    /* WebGL 不可用/初始化失败：隐藏本画布，交还 star-db.js 2D fallback */
    window.__starDbWebGLBg = false;
    if (cv) { cv.classList.add("stars-bg-fallback"); }
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /* ==================== GLSL ==================== */
  var VERT_SRC = [
    "#version 300 es",
    "layout(location=0) in vec2 aPos;",
    "out vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAG_SRC = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 fragColor;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform float uMotion;", /* 1.0 正常 / 0.0 reduced-motion 冻结时间 */

    "float hash21(vec2 p) {",
    "  p = fract(p * vec2(127.1, 311.7));",
    "  p += dot(p, p + 23.32);",
    "  return fract(p.x * p.y);",
    "}",

    "float vnoise(vec2 p) {",
    "  vec2 i = floor(p); vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  float a = hash21(i);",
    "  float b = hash21(i + vec2(1.0, 0.0));",
    "  float c = hash21(i + vec2(0.0, 1.0));",
    "  float d = hash21(i + vec2(1.0, 1.0));",
    "  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);",
    "}",

    /* 4 层 value-noise fbm，形成弥散尘埃/星云的柔和块状纹理 */
    "float fbm(vec2 p) {",
    "  float v = 0.0; float amp = 0.5;",
    "  for (int i = 0; i < 4; i++) {",
    "    v += amp * vnoise(p);",
    "    p = p * 2.03 + vec2(17.31, 9.17);",
    "    amp *= 0.5;",
    "  }",
    "  return v;",
    "}",

    /* 两层稀疏星光点：cell 内随机坐标的柔和小点 + 低频闪烁 */
    "float starLayer(vec2 uv, float cell) {",
    "  vec2 g = uv * uRes / cell;",
    "  vec2 id = floor(g);",
    "  float h = hash21(id);",
    "  if (h >= 0.94) {",
    "    vec2 fc = fract(g) - 0.5;",
    "    vec2 off = vec2(hash21(id + vec2(7.31, 1.73)), hash21(id + vec2(1.19, 9.71))) - 0.5;",
    "    vec2 r = fc - off;",
    "    float size = 0.14 + 0.30 * hash21(id + vec2(3.11, 5.57));",
    "    float d = length(r);",
    "    float star = 1.0 - smoothstep(size * 0.85, size * 1.05, d);",
    "    float tw = 0.38 + 0.62 * (0.5 + 0.5 * sin(uMotion * uTime * (1.4 + h * 5.0) + h * 37.7));",
    "    float lum = 0.30 + 0.70 * hash21(id + vec2(13.7, 2.3));",
    "    return star * tw * lum;",
    "  }",
    "  return 0.0;",
    "}",

    "void main() {",
    "  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);",
    "  vec2 p = (vUv - 0.5) * aspect * 2.2;",
    "  float t = uMotion * uTime * 0.018;",

    /* 基线：深空底 → 底部微亮的纵向渐变（很低） */
    "  vec3 col = mix(vec3(0.003, 0.005, 0.020), vec3(0.012, 0.018, 0.050), smoothstep(0.0, 1.0, vUv.y));",

    /* 多层缓慢流动的蓝紫/深靛星云 */
    "  float n1 = fbm(p * 0.55 + vec2(t * 0.42, -t * 0.31));",
    "  float n2 = fbm(p * 1.05 - vec2(t * 0.26, t * 0.18) + vec2(4.7, 9.1));",
    "  float n3 = fbm(p * 1.90 + vec2(t * 0.13, -t * 0.10) + vec2(11.3, 4.2));",
    "  float neb = 0.60 * n1 + 0.27 * n2 + 0.13 * n3;",
    "  vec3 nebCol = mix(vec3(0.10, 0.15, 0.36), vec3(0.30, 0.25, 0.62), clamp(n1 * 1.35, 0.0, 1.0));",
    "  nebCol = mix(nebCol, vec3(0.20, 0.30, 0.68), clamp(n2 * 1.15, 0.0, 1.0));",
    "  nebCol = mix(nebCol, vec3(0.09, 0.14, 0.38), clamp(n3, 0.0, 1.0));",
    "  float emiss = smoothstep(0.30, 0.88, neb);",
    "  col += nebCol * (0.05 + 0.42 * emiss);",
    "  col += vec3(0.05, 0.07, 0.15) * (neb * 0.20);",

    /* 柔和中心气辉：径向低饱和弥散，无生硬亮圈 */
    "  float d = length(p);",
    "  float glow = 1.0 - smoothstep(0.10, 0.85, d);",
    "  col += vec3(0.10, 0.13, 0.30) * glow * 0.22;",

    /* 数千颗远处星光点（两层不同疏密，避免大而圆的光斑） */
    "  float s1 = starLayer(vUv, 9.0);",
    "  float s2 = starLayer(vUv * 1.17 + vec2(331.0, 217.0), 15.0);",
    "  col += vec3(0.80, 0.87, 1.0) * min(s1 * 2.4, 1.0) * 0.9;",
    "  col += vec3(0.78, 0.85, 1.0) * min(s2 * 2.4, 1.0) * 0.5;",

    /* 暗角收边 */
    "  float vig = 1.0 - 0.40 * smoothstep(0.60, 1.30, d);",
    "  col *= vig;",

    "  fragColor = vec4(clamp(col, 0.0, 1.2), 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      var info = gl.getShaderInfoLog(sh) || "compile error";
      try { console.warn("[star-db-bg-webgl] shader compile failed: " + info); } catch (e) {}
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = gl.createShader(gl.VERTEX_SHADER), fs = null, prog = null;
  vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  if (vs) { fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC); }
  if (vs && fs) {
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      try { console.warn("[star-db-bg-webgl] link failed: " + (gl.getProgramInfoLog(prog) || "link error")); } catch (e) {}
      gl.deleteProgram(prog); prog = null;
    }
  }
  if (vs) gl.deleteShader(vs);
  if (fs) gl.deleteShader(fs);
  if (!prog) { fail(); return; }

  gl.useProgram(prog);

  /* 全屏三角形 strip（覆盖画布） */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(prog, "uRes");
  var uTime = gl.getUniformLocation(prog, "uTime");
  var uMotion = gl.getUniformLocation(prog, "uMotion");

  /* ------- 渲染尺寸：按设备能力降内部分辨率（CSS 由 DPR 与比例因子共同决定） ------- */
  var isTouch = false;
  try { isTouch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window); } catch (e) {}
  var scale = isTouch ? 0.45 : 0.65;

  function sizeCanvas() {
    var w = Math.max(1, cv.clientWidth || 0);
    var h = Math.max(1, cv.clientHeight || 0);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.round(w * dpr * scale));
    var H = Math.max(1, Math.round(h * dpr * scale));
    /* 极高分辨率上限保护：总像素超限时等比降档 */
    var maxPix = 1280 * 800;
    if (W * H > maxPix) {
      var k = Math.sqrt(maxPix / (W * H));
      W = Math.max(1, Math.round(W * k));
      H = Math.max(1, Math.round(H * k));
    }
    if (cv.width !== W || cv.height !== H) {
      cv.width = W;
      cv.height = H;
      gl.viewport(0, 0, W, H);
    }
    return W * H > 0;
  }

  function draw(ts) {
    if (!sizeCanvas()) return;
    var t = reduced ? 0 : (ts || 0) * 0.001;
    gl.useProgram(prog);
    gl.uniform2f(uRes, cv.width, cv.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uMotion, reduced ? 0.0 : 1.0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function frame(ts) {
    if (!running) return;
    if (visible && !reduced) {
      draw(ts);
      rafId = requestAnimationFrame(frame);
    } else {
      /* reduced-motion：仅渲染一次静态帧后挂起；可见性/尺寸/偏好变化由 kick 唤醒重绘 */
      if (visible) draw(ts);
      running = false;
      rafId = 0;
    }
  }

  function kick() {
    if (!running) {
      running = true;
      rafId = requestAnimationFrame(frame);
    } else if (reduced || !visible) {
      frame(performance.now());
    }
  }

  function onViewport() { kick(); }

  if (window.IntersectionObserver) {
    var io = new IntersectionObserver(function (entries) {
      visible = !!(entries[0] && entries[0].isIntersecting);
      kick();
    }, { threshold: 0 });
    io.observe(cv);
  }

  var mq = null;
  if (window.matchMedia) {
    mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    var onMq = function () {
      reduced = !!(mq && mq.matches);
      kick();
    };
    if (mq.addEventListener) { mq.addEventListener("change", onMq); }
    else if (mq.addListener) { mq.addListener(onMq); }
  }

  window.addEventListener("resize", onViewport);
  document.addEventListener("visibilitychange", onViewport);

  window.__starDbWebGLBg = true;
  kick();
})();
