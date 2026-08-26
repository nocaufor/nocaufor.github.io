/* nocau Fun 调色板：取色/色值转换/配色生成（CSP 兼容，无内联事件） */
(function () {
  "use strict";

  var picker = document.getElementById("c-picker");
  var infoEl = document.getElementById("c-info");
  var copyBtn = document.getElementById("c-copy");
  var paletteEl = document.getElementById("c-palette");
  if (!picker) return;

  var current = "#7aa2f7";

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    function h(v) { return ("0" + Math.round(v).toString(16)).slice(-2); }
    return "#" + h(r) + h(g) + h(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
  }

  function describe(hex) {
    var rgb = hexToRgb(hex);
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hex.toUpperCase() + " · RGB(" + rgb.r + "," + rgb.g + "," + rgb.b + ") · HSL(" + hsl.h + "," + hsl.s + "%," + hsl.l + "%)";
  }

  function copyText(text, el) {
    function done() {
      if (el) {
        var old = el.textContent;
        el.textContent = "已复制";
        setTimeout(function () { el.textContent = old; }, 1000);
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function showPalette(hexes) {
    paletteEl.innerHTML = "";
    hexes.forEach(function (hex) {
      var chip = document.createElement("div");
      chip.className = "c-chip";
      chip.style.background = hex;
      var span = document.createElement("span");
      span.textContent = hex.toUpperCase();
      chip.appendChild(span);
      chip.addEventListener("click", function () { copyText(hex, span); });
      paletteEl.appendChild(chip);
    });
  }

  function setCurrent(hex) {
    current = hex;
    picker.value = hex;
    infoEl.textContent = describe(hex);
    showPalette([hex]);
  }

  function generate(mode) {
    var hsl = rgbToHsl(hexToRgb(current).r, hexToRgb(current).g, hexToRgb(current).b);
    var out = [];
    if (mode === "analog") {
      for (var i = -2; i <= 2; i++) out.push(hslToHex((hsl.h + i * 30 + 360) % 360, hsl.s, hsl.l));
    } else if (mode === "complement") {
      out = [current, hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l)];
    } else if (mode === "triadic") {
      out = [current, hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)];
    } else if (mode === "shades") {
      for (var k = 2; k <= 9; k++) out.push(hslToHex(hsl.h, hsl.s, Math.round(k * 10)));
    }
    showPalette(out);
  }

  picker.addEventListener("input", function () { setCurrent(picker.value); });
  copyBtn.addEventListener("click", function () { copyText(current, copyBtn); });
  document.getElementById("c-analog").addEventListener("click", function () { generate("analog"); });
  document.getElementById("c-complement").addEventListener("click", function () { generate("complement"); });
  document.getElementById("c-triadic").addEventListener("click", function () { generate("triadic"); });
  document.getElementById("c-shades").addEventListener("click", function () { generate("shades"); });

  setCurrent(current);
})();
