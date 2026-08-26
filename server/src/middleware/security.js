'use strict';
/**
 * security.js — 安全中间件
 * 1. 请求体大小限制（防超大 payload）
 * 2. 安全响应头（x-powered-by 移除）
 */
const express = require('express');

function applyBodyLimits() {
  return [
    express.json({ limit: '16kb' }),
    express.urlencoded({ extended: false, limit: '16kb' }),
  ];
}

function hideServerSignature(req, res, next) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

module.exports = { applyBodyLimits, hideServerSignature };
