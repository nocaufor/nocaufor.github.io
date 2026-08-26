'use strict';
/**
 * db.js — SQLite 数据库初始化（Node 内置 node:sqlite，零原生编译依赖）
 * 表结构：
 *   messages  联系表单留言（含来源 IP / UA，用于防滥用审计）
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './data/nocau.db');

let db = null;

function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      ip         TEXT,
      user_agent TEXT,
      status     TEXT    NOT NULL DEFAULT 'new',
      created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  return db;
}

module.exports = { getDb, DB_PATH };
