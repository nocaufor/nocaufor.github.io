/* tailwind-config.js：Tailwind 运行时配置（原为 index.html 内联脚本，外移以收紧 CSP，无 unsafe-inline/eval） */
/* 本地脚本兜底：脚本未就绪时先占位，避免 ReferenceError 影响后续初始化 */
window.tailwind = window.tailwind || {};
tailwind.config = { darkMode: ['class', '[data-theme="dark"]'], theme: { extend: {} } };
