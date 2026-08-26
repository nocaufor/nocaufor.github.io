/* nocau 站内中英双语切换（CSP 兼容：外部脚本、无内联事件） */
(function () {
  "use strict";

  var STORE_KEY = "nocau-lang";

  var DICT = {
    zh: {
      nav_home: "首页",
      nav_projects: "作品集",
      nav_fun: "代码开发",
      nav_ideas: "想法项目",
      nav_about: "关于",
      nav_contact: "联系",
      lang_aria: "切换语言",
      theme_aria: "切换深浅色模式",
      nav_aria: "切换导航菜单",
      back_aria: "回到顶部",
      footer_slogan: "让科技引领文明进步",
      btn_view: "查看详情",
      btn_more: "查看更多",
      btn_all: "全部",
      btn_back_home: "返回首页",
      hero_title_html: "用实践将想法变成现实。",
      hero_typing: "开发者 · nocau",
      btn_projects: "查看作品集",
      btn_ideas: "想法项目",
      sec_stats: "数据统计",
      sec_capabilities: "能力矩阵",
      sec_tech: "技术栈",
      sec_featured: "精选项目",
      sec_timeline: "发展时间线",
      sec_process: "开发流程",
      sec_voices: "用户之声",
      proj_page_title: "作品集",
      proj_page_desc: "从工具到平台，每一件都在解决真实问题。",
      proj_all: "全部项目",
      proj_miniapp: "小程序",
      proj_ai: "AI 平台",
      ideas_page_title: "想法项目",
      ideas_page_desc: "把想法写下来，把方案做出来。",
      ideas_all: "全部",
      ideas_code: "实用代码",
      ideas_tool: "工具",
      ideas_ai: "AI应用",
      ideas_eff: "效率协作",
      ideas_hw: "硬件",
      ideas_os: "开源",
      ideas_auto: "机器自动化",
      ideas_web: "网页",
      ideas_social: "社交",
      ideas_expand: "展开详情",
      ideas_collapse: "收起",
      ideas_search: "搜索",
      ideas_search_ph: "搜索方案标题 / 关键词 / 技术栈…",
      ideas_count: "共 {n} 个方案",
      ideas_collapse_all: "全部收起",
      ideas_done: "已落地 → 代码开发",
      ideas_wait: "硬件/资源依赖 · 暂缓",
      ideas_empty: "没有符合条件的想法",
      ideas_hwiot: "硬件物联网",
      ideas_close: "关闭详情",
      ideas_group_code: "实用代码",
      ideas_group_ideas: "想法方案",
      ideas_group_works: "作品",
      about_page_title: "关于",
      about_page_desc: "开发者。只做简单、可靠、能解决真实问题的产品。",
      about_role: "开发者 · nocau",
      about_motto: "让科技引领文明进步",
      about_motto_en: "Let Technology Lead Civilization Forward",
      about_intro: "简介",
      about_intro_text: "从移动端工具到 AI 平台，这里沉淀了多款从想法到上线的产品实践：微信小程序「衣件通」、Android 应用「好友检测」「LINGO 广告拦截」、统一 AI 工具平台「AI hub」。每一条代码都服务于一个真实问题，不堆砌概念、不追逐噪音。",
      about_direction: "技术方向",
      about_timeline: "实践轨迹",
      about_values: "价值观",
      about_v1: "克制",
      about_v1_d: "少即是多。不添加无用的功能，不追逐浮躁的技术。",
      about_v2: "可靠",
      about_v2_d: "上线只是开始，稳定运行与可维护性才是长期价值。",
      about_v3: "真实",
      about_v3_d: "每个产品对应一个真实问题，用数据与用户反馈说话。",
      about_t1_t: "移动端工具起步",
      about_t1_d: "「衣件通」服装管理小程序、「好友检测」Android 应用上线。",
      about_t2_t: "安全与适老化",
      about_t2_d: "「LINGO」广告拦截与风险检测，面向老年用户降低误触与诈骗风险。",
      about_t3_t: "内容与社区化",
      about_t3_d: "建设 fun 代码开发子站与 29 个想法方案库，探索开发者的表达方式。",
      about_t4_t: "AI 基础设施",
      about_t4_d: "建设「AI hub」统一工具平台，并持续补充自动化与前沿开源代码实践。",
      contact_page_title: "联系",
      contact_page_desc: "有想法？欢迎一起把它变成现实。",
      contact_name: "姓名",
      contact_email: "邮箱",
      contact_subject: "主题",
      contact_message: "留言",
      contact_submit: "发送消息",
      contact_name_ph: "您的姓名",
      contact_email_ph: "you@example.com",
      contact_subject_ph: "一句话说明来意",
      contact_message_ph: "想聊什么？",
      nf_title: "页面不存在",
      nf_desc: "你访问的页面不存在或已被移动。",
      fun_code: "代码开发",
      fun_back: "返回代码开发合集",
      fun_theme: "切换样式",
      code_copy: "复制代码",
      code_copied: "已复制",
      code_copy_fail: "复制失败，请手动选择代码",
      disclaimer_title: "合规声明",
      pg_miniapp_login: "小程序登录与支付封装",
      pg_miniapp_components: "小程序自定义组件库",
      pg_miniapp_poster: "小程序分享海报生成",
      pg_chat: "虚拟对象 · 人味儿对话陪伴",
      pg_laser: "激光追踪打蚊器模拟",
      pg_auto: "自动化开发工具集",
      pg_mcu_led: "单片机 LED 与点阵控制",
      pg_mcu_sensor: "单片机传感器采集",
      pg_crawler: "网络爬虫与反爬基础",
      pg_pentest: "网络攻防与白帽渗透基础",
      pg_websec: "Web 漏洞原理与防御",
      pg_agent: "AI Agent 实验框架",
      pg_multimodal: "多模态 AI 实验",
      pg_edge: "边缘 AI 推理实践",
      pg_os: "系统知识：操作系统原理",
      pg_embedded: "系统知识：嵌入式系统",
      pg_distributed: "系统知识：分布式系统",
      pg_db: "系统知识：数据库系统",
      pg_network: "系统知识：网络协议栈",
      pg_christmas: "圣诞树 · 多风格装饰",
      stars3d_like: "赞一下",
      stars3d_dislike: "不感兴趣",
      stars3d_note: "点赞会让星星更亮，不感兴趣会变暗。",
      stars3d_close_aria: "关闭"
    },
    en: {
      nav_home: "Home",
      nav_projects: "Projects",
      nav_fun: "Code Lab",
      nav_ideas: "Ideas",
      nav_about: "About",
      nav_contact: "Contact",
      lang_aria: "Switch language",
      theme_aria: "Toggle theme",
      nav_aria: "Toggle navigation menu",
      back_aria: "Back to top",
      footer_slogan: "Let Technology Lead Civilization Forward",
      btn_view: "View details",
      btn_more: "View more",
      btn_all: "All",
      btn_back_home: "Back to Home",
      hero_title_html: "Practice turns ideas into reality.",
      hero_typing: "Developer · nocau",
      btn_projects: "View Projects",
      btn_ideas: "Idea Projects",
      sec_stats: "By the Numbers",
      sec_capabilities: "Capabilities",
      sec_tech: "Technology",
      sec_featured: "Featured Projects",
      sec_timeline: "Timeline",
      sec_process: "Process",
      sec_voices: "Voices",
      proj_page_title: "Projects",
      proj_page_desc: "From tools to platforms — every project solves a real problem.",
      proj_all: "All Projects",
      proj_miniapp: "Mini Program",
      proj_ai: "AI Platform",
      ideas_page_title: "Idea Projects",
      ideas_page_desc: "Write ideas down. Build them into reality.",
      ideas_all: "All",
      ideas_code: "Utility Code",
      ideas_tool: "Tools",
      ideas_ai: "AI Apps",
      ideas_eff: "Efficiency",
      ideas_hw: "Hardware",
      ideas_os: "Open Source",
      ideas_auto: "Automation",
      ideas_web: "Web",
      ideas_social: "Social",
      ideas_expand: "Expand",
      ideas_collapse: "Collapse",
      ideas_search: "Search",
      ideas_search_ph: "Search by title / keyword / stack…",
      ideas_count: "{n} ideas",
      ideas_collapse_all: "Collapse all",
      ideas_done: "Landed → Code Lab",
      ideas_wait: "Hardware / heavy deps · deferred",
      ideas_empty: "No matching ideas",
      ideas_hwiot: "Hardware & IoT",
      ideas_close: "Close details",
      ideas_group_code: "Utility Code",
      ideas_group_ideas: "Idea Blueprints",
      ideas_group_works: "Featured Works",
      about_page_title: "About",
      about_page_desc: "Developer. Only simple, reliable products that solve real problems.",
      about_role: "Developer · nocau",
      about_motto: "Let Technology Lead Civilization Forward",
      about_motto_en: "Let Technology Lead Civilization Forward",
      about_intro: "Profile",
      about_intro_text: "From mobile tools to an AI platform, this site holds product practices shipped from idea to launch: WeChat mini program \"YJT\", Android apps \"Friend Check\" and \"LINGO\", and the unified AI tool platform \"AI hub\". Every line of code serves a real problem — no buzzwords, no noise.",
      about_direction: "Tech Focus",
      about_timeline: "Journey",
      about_values: "Values",
      about_v1: "Restraint",
      about_v1_d: "Less is more. No useless features, no chasing hype.",
      about_v2: "Reliability",
      about_v2_d: "Launch is the start. Stability and maintainability pay off long-term.",
      about_v3: "Authenticity",
      about_v3_d: "Each product answers a real problem, judged by data and feedback.",
      about_t1_t: "Mobile tools",
      about_t1_d: "Launched \"YJT\" wardrobe mini program and \"Friend Check\" Android app.",
      about_t2_t: "Security & aging-friendly",
      about_t2_d: "Built \"LINGO\" ad blocker and risk detection for elderly users.",
      about_t3_t: "Content & community",
      about_t3_d: "Built the fun playground and a library of 29 idea blueprints.",
      about_t4_t: "AI infrastructure",
      about_t4_d: "Building \"AI hub\" and expanding automation & frontier open-source practice.",
      contact_page_title: "Contact",
      contact_page_desc: "Have an idea? Let's turn it into reality together.",
      contact_name: "Name",
      contact_email: "Email",
      contact_subject: "Subject",
      contact_message: "Message",
      contact_submit: "Send Message",
      contact_name_ph: "Your name",
      contact_email_ph: "you@example.com",
      contact_subject_ph: "One-line summary",
      contact_message_ph: "What would you like to talk about?",
      nf_title: "Page Not Found",
      nf_desc: "The page you are looking for does not exist or has been moved.",
      fun_code: "Code Lab",
      fun_back: "Back to Code Lab",
      fun_theme: "Switch style",
      code_copy: "Copy code",
      code_copied: "Copied",
      code_copy_fail: "Copy failed, select code manually",
      disclaimer_title: "Compliance Notice",
      pg_miniapp_login: "Mini Program Login & Payment",
      pg_miniapp_components: "Mini Program Custom Components",
      pg_miniapp_poster: "Mini Program Share Poster",
      pg_chat: "Virtual Companion · Human-like Chat",
      pg_laser: "Laser Mosquito Tracker Demo",
      pg_auto: "Automation Toolkit",
      pg_mcu_led: "MCU LED & Matrix Control",
      pg_mcu_sensor: "MCU Sensor Collection",
      pg_crawler: "Web Crawler & Anti-Bot Basics",
      pg_pentest: "Pentest & White-Hat Basics",
      pg_websec: "Web Vulnerability Principles & Defense",
      pg_agent: "AI Agent Experiment Framework",
      pg_multimodal: "Multimodal AI Experiments",
      pg_edge: "Edge AI Inference Practice",
      pg_os: "System Knowledge: Operating Systems",
      pg_embedded: "System Knowledge: Embedded Systems",
      pg_distributed: "System Knowledge: Distributed Systems",
      pg_db: "System Knowledge: Database Systems",
      pg_network: "System Knowledge: Network Stack",
      pg_christmas: "Christmas Tree · Multi-style Decor",
      stars3d_like: "Like",
      stars3d_dislike: "Not interested",
      stars3d_note: "Liked stars shine brighter; disliked ones fade out.",
      stars3d_close_aria: "Close"
    }
  };

  function getLang() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}
    return stored === "en" || stored === "zh" ? stored : "zh";
  }

  function setLang(lang) {
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
  }

  function applyLang(lang) {
    var dict = DICT[lang] || DICT.zh;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) el.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      var spec = el.getAttribute("data-i18n-attr");
      spec.split(",").forEach(function (pair) {
        var kv = pair.split("=");
        var attr = kv[0].trim();
        var key = (kv[1] || "").trim();
        if (dict[key] !== undefined) el.setAttribute(attr, dict[key]);
      });
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-ph");
      if (dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
    });
    document.querySelectorAll("[data-i18n-type]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-type");
      if (dict[key] !== undefined) el.setAttribute("data-text", dict[key]);
    });
    document.querySelectorAll("[data-i18n-hide]").forEach(function (el) {
      var hideFor = el.getAttribute("data-i18n-hide");
      el.style.display = hideFor === lang ? "none" : "";
    });
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.textContent = lang === "zh" ? "EN" : "中文";
    });
  }

  function init() {
    var lang = getLang();
    applyLang(lang);
    document.querySelectorAll("[data-lang-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var next = getLang() === "zh" ? "en" : "zh";
        setLang(next);
        applyLang(next);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
