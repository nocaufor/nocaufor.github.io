'use strict';
/**
 * contact.js — 联系表单路由
 * POST /api/contact   提交留言（公开，限流 + 校验）
 * GET  /api/messages  查看留言列表（需 ADMIN_TOKEN，Bearer 鉴权）
 * PATCH /api/messages/:id  更新留言状态（需 ADMIN_TOKEN）
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db');

const router = express.Router();

/* ---------- 输入校验 ---------- */
const NAME_MAX = 50;
const EMAIL_MAX = 120;
const MESSAGE_MAX = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function sanitizeText(v) {
  if (typeof v !== 'string') return '';
  // 去除控制字符，保留可见文本与常见标点
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

function validateContact(body) {
  const name = sanitizeText(body.name);
  const email = sanitizeText(body.email).toLowerCase();
  const message = sanitizeText(body.message);

  const errors = [];
  if (!name || name.length > NAME_MAX) errors.push('姓名不能为空且不超过50字');
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.push('邮箱格式不正确');
  if (!message || message.length > MESSAGE_MAX) errors.push('留言不能为空且不超过2000字');

  return { ok: errors.length === 0, errors, data: { name, email, message } };
}

/* ---------- 管理端鉴权 ---------- */
function adminAuth(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  const auth = req.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  // 使用固定时间比较，缓解时序侧信道
  let match = token && provided && token.length === provided.length;
  if (match) {
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    match = diff === 0;
  }
  if (!match) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

/* ---------- 提交留言（公开） ---------- */
const contactLimiter = rateLimit({
  windowMs: Number(process.env.CONTACT_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.CONTACT_RATE_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '提交过于频繁，请稍后再试' },
});

router.post('/contact', contactLimiter, (req, res) => {
  const { ok, errors, data } = validateContact(req.body || {});
  if (!ok) {
    return res.status(400).json({ error: 'invalid_input', details: errors });
  }

  // 参数化查询，天然防 SQL 注入
  const stmt = getDb().prepare(
    'INSERT INTO messages (name, email, message, ip, user_agent) VALUES (?, ?, ?, ?, ?)'
  );
  const ip = (req.ip || '').slice(0, 64);
  const ua = (req.get('user-agent') || '').slice(0, 255);

  const info = stmt.run(data.name, data.email, data.message, ip, ua);

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

/* ---------- 查看留言列表（管理端） ---------- */
router.get('/messages', adminAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) AS c FROM messages').get().c;
  const rows = db
    .prepare('SELECT id, name, email, message, ip, user_agent, status, created_at FROM messages ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(pageSize, (page - 1) * pageSize);

  res.json({ ok: true, total, page, pageSize, items: rows });
});

/* ---------- 更新留言状态（管理端） ---------- */
router.patch('/messages/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'invalid_id' });
  }
  const status = ['new', 'read', 'replied', 'archived'].includes(req.body.status)
    ? req.body.status
    : null;
  if (!status) {
    return res.status(400).json({ error: 'invalid_status' });
  }

  const info = getDb().prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id);
  if (info.changes === 0) {
    return res.status(404).json({ error: 'not_found' });
  }
  res.json({ ok: true, id, status });
});

module.exports = router;
