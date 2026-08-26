'use strict';
/**
 * index.js — nocau.com 后端服务入口
 * 职责：
 *   1. 托管 portfolio-site 静态文件（保持现有纯静态站点零改动）
 *   2. 提供 /api/contact 联系表单接收（写入 SQLite）
 *   3. 提供 /api/messages 管理接口（Bearer Token 鉴权）
 * 安全基线：
 *   - helmet 安全头 + CSP 交由页面 meta 控制
 *   - CORS 白名单（默认仅同源）
 *   - 请求体 16kb 上限
 *   - 联系表单 IP 限流
 *   - 参数化 SQL（better-sqlite3 prepared statement）
 */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const { applyBodyLimits, hideServerSignature } = require('./middleware/security');
const contactRouter = require('./routes/contact');
const { DB_PATH } = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

/* 信任代理（部署在 Nginx 后时设为 1，保证 rate-limit / req.ip 正确） */
if (Number(process.env.TRUST_PROXY) > 0) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY));
}

/* ---------- 全局安全中间件 ---------- */
// 页面已自带 meta CSP（script-src 'self'），helmet 不再注入 CSP 避免策略冲突
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hideServerSignature);
app.use(applyBodyLimits());

// CORS：默认仅同源；如需跨域子域可在此配置
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false,
  methods: ['GET', 'POST', 'PATCH'],
  maxAge: 86400,
}));

/* ---------- 简易请求日志 ---------- */
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    const t0 = Date.now();
    res.on('finish', () => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t0}ms`);
    });
  }
  next();
});

/* ---------- API 路由 ---------- */
app.use('/api', contactRouter);

/* ---------- 健康检查 ---------- */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'nocau-portfolio-server', time: new Date().toISOString() });
});

/* ---------- 静态文件托管 ---------- */
const STATIC_DIR = path.resolve(__dirname, '..', process.env.STATIC_DIR || '..');
app.use(express.static(STATIC_DIR, {
  index: 'index.html',
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  setHeaders(res) {
    // 防止 MIME 嗅探
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

/* ---------- 404 与错误处理 ---------- */
app.use((req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'internal_error' });
});

/* ---------- 启动 ---------- */
app.listen(PORT, () => {
  console.log(`[nocau-server] listening on http://localhost:${PORT}`);
  console.log(`[nocau-server] static dir: ${STATIC_DIR}`);
  console.log(`[nocau-server] db file: ${DB_PATH}`);
});
