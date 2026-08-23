/* ============================================================
   Portfolio Site - 主交互脚本（无依赖，原生 JS）
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. 站点配置（未来扩展：可集中维护品牌/导航/链接） ----------
     升级为公司官网时：扩充 navItems、brandName、socialLinks 即可，
     HTML 中对应区块会自动渲染或通过模板同步维护。 */
  var SITE_CONFIG = {
    brandName: "Developer",
    navItems: [
      { label: "首页", href: "index.html" },
      { label: "作品集", href: "projects.html" },
      { label: "关于", href: "about.html" },
      { label: "联系", href: "contact.html" }
    ],
    // 未来扩展占位：新增导航项只需在此追加
    futureNavPlaceholder: true
  };

  /* ---------- 2. 移动端导航切换 ---------- */
  function initNavToggle() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      toggle.classList.toggle("open");
      links.classList.toggle("open");
    });

    // 点击导航项后自动收起
    links.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
      });
    });
  }

  /* ---------- 3. 当前页面高亮导航 ---------- */
  function initActiveNav() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-links a").forEach(function (link) {
      var href = link.getAttribute("href");
      if (href === path) {
        link.classList.add("active");
      }
    });
  }

  /* ---------- 4. 滚动显现动画（IntersectionObserver） ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---------- 5. 联系表单（纯前端示例：
     无后端依赖，提交后展示提示。
     如需真实收信，可对接 Formspree / Getform / 未来公司接口） ---------- */
  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("name").value.trim();
      var email = document.getElementById("email").value.trim();
      var message = document.getElementById("message").value.trim();

      if (!name || !email || !message) {
        showFormMessage("请完整填写姓名、邮箱和留言内容。", "error");
        return;
      }

      // 邮箱格式简单校验
      var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        showFormMessage("邮箱格式不正确，请检查后重试。", "error");
        return;
      }

      showFormMessage(
        "提交成功（演示模式）。当前为静态站点，未接入后端；" +
          "可将表单接入 Formspree 等表单服务或未来公司邮件接口。",
        "success"
      );
      form.reset();
    });
  }

  function showFormMessage(text, type) {
    var hint = document.getElementById("form-message");
    if (!hint) return;
    hint.textContent = text;
    hint.style.color = type === "error" ? "#ef4444" : "#22c55e";
  }

  /* ---------- 6. 页脚年份自动更新 ---------- */
  function initFooterYear() {
    var el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- 7. 初始化 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNavToggle();
    initActiveNav();
    initReveal();
    initContactForm();
    initFooterYear();
  });
})();
