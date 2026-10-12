/* ============================================================
   contact.js — 联系页交互（表单焦点光晕 / 提交动效）
   无内联脚本、CSP 兼容、prefers-reduced-motion 降级
   ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  /* ---------- 联系卡 tilt 3D ---------- */
  if (fine) {
    var cards = document.querySelectorAll('.contact-method');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--tilt-x', (px * 10).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', (-py * 10).toFixed(2) + 'deg');
      }, { passive: true });
      card.addEventListener('mouseleave', function () {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      }, { passive: true });
    });
  }

  /* ---------- 表单焦点光晕 ---------- */
  var groups = document.querySelectorAll('.form-group');
  Array.prototype.forEach.call(groups, function (g) {
    var input = g.querySelector('input, textarea');
    if (!input) return;
    input.addEventListener('focus', function () { g.classList.add('focus'); }, false);
    input.addEventListener('blur', function () { g.classList.remove('focus'); }, false);
  });

  /* ---------- 提交按钮动效（不影响 main.js 校验逻辑） ---------- */
  var form = document.getElementById('contact-form');
  var btn = form && form.querySelector('.btn-primary');
  if (form && btn) {
    form.addEventListener('submit', function () {
      btn.classList.add('submitted');
      setTimeout(function () { btn.classList.remove('submitted'); }, 900);
    }, false);
  }
})();
