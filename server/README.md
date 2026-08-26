---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_a52940efa15111f1a54f525400f8a581
    ReservedCode1: KReyb6X+iXOitciDfyNLMNiL0gpYMB24Vm+3YZSZz1gXMX5ZlM6cSn3Kcg89Z3fLViq6CYxT5hSZt9gmB4fJf/wB7U/hHZ+uw7FvscBEyAsCNWZ/o1K9exbxhGNr/ae3jCFOc2rA0dJo8Rn2ldqA1ozY/VV67AfO9kqDfpR+f5gK5xbhiHxhvtAYMjk=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_a52940efa15111f1a54f525400f8a581
    ReservedCode2: KReyb6X+iXOitciDfyNLMNiL0gpYMB24Vm+3YZSZz1gXMX5ZlM6cSn3Kcg89Z3fLViq6CYxT5hSZt9gmB4fJf/wB7U/hHZ+uw7FvscBEyAsCNWZ/o1K9exbxhGNr/ae3jCFOc2rA0dJo8Rn2ldqA1ozY/VV67AfO9kqDfpR+f5gK5xbhiHxhvtAYMjk=
---

# nocau.com 后端服务（Express + SQLite）

作品集站的带后端服务：托管静态站点 + 联系表单接收 + 留言管理接口。

## 技术栈

- **Node.js >= 18**（本机 v24.14.0 已验证）
- **Express 4** — Web 框架
- **node:sqlite**（Node 内置 SQLite，零原生编译、零额外数据库依赖）
- **helmet** — 安全响应头
- **express-rate-limit** — 表单限流防刷
- **cors** — 跨域白名单
- **dotenv** — 环境变量

## 目录结构

```
server/
├── package.json          # 依赖与脚本
├── .env.example          # 环境变量模板（复制为 .env）
├── .env                  # 实际配置（已 gitignore，严禁提交）
├── npm-install.log       # 安装日志
├── data/                 # SQLite 数据文件（已 gitignore）
└── src/
    ├── index.js          # 服务入口：静态托管 + API + 安全中间件
    ├── db.js             # SQLite 初始化（node:sqlite）
    ├── middleware/
    │   └── security.js   # 请求体限制 / 安全头
    └── routes/
        └── contact.js    # 联系表单 API + 管理接口
```

## 快速开始

```bash
cd server
cp .env.example .env        # 修改 ADMIN_TOKEN 为强随机串
npm install
npm start                   # http://localhost:3000
```

- `npm run dev` — 开发模式（文件变更自动重启）
- `npm run db:init` — 手动初始化数据库（通常无需，启动时自动建表）

## API 说明

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/contact` | 公开（限流 5 次/15 分钟/IP） | 提交留言 `{name, email, message}` |
| GET | `/api/messages` | Bearer ADMIN_TOKEN | 分页查看留言列表 `?page=1&pageSize=20` |
| PATCH | `/api/messages/:id` | Bearer ADMIN_TOKEN | 更新留言状态 `{status: new\|read\|replied\|archived}` |
| GET | `/api/health` | 公开 | 健康检查 |

管理接口调用示例：

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:3000/api/messages
```

## 安全基线（已内置）

- **SQL 注入**：全部参数化查询（prepared statement）
- **XSS**：输入仅去除控制字符、长度限制；输出由前端 textContent 渲染（无 innerHTML 注入点）
- **限流**：联系表单按 IP 限流，防刷屏
- **鉴权**：管理接口 Bearer Token，固定时间比较防时序侧信道
- **响应头**：helmet + nosniff + DENY 框架保护 + Referrer-Policy
- **请求体**：16kb 上限，防超大 payload
- **CORS**：默认仅同源
- **密钥**：全部走环境变量，`.env` 已 gitignore

## 生产部署

本机开发完成后推生产环境的两种方式：

### 方式一：云服务器（推荐，可控性最强）

1. 服务器安装 Node 20+ LTS、Nginx、PM2
2. 上传 `portfolio-site` 全量
3. `cd server && npm install && cp .env.example .env`（设置强 ADMIN_TOKEN）
4. PM2 托管：`npm i -g pm2 && pm2 start src/index.js --name nocau`
5. Nginx 反代：

```nginx
server {
    listen 80;
    server_name nocau.com www.nocau.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

6. 申请 HTTPS：`certbot --nginx -d nocau.com -d www.nocau.com`
7. 反代时把 `.env` 的 `TRUST_PROXY=1`，保证限流按真实 IP 生效

### 方式二：Vercel / Render 等 PaaS

- 根目录保持纯静态站（可直接托管静态部分）
- `server/` 单独作为 Node 服务部署，注意 `node:sqlite` 需要运行时支持（Node 22+）

## 运维清单

- 备份：定期复制 `server/data/nocau.db`（或直接备份整个 U 盘目录）
- 日志：服务启动日志在控制台；生产用 PM2 的 `pm2 logs nocau`
- 监控：`/api/health` 接入可用性监控
- 更新：`git pull` 后 `pm2 restart nocau`
*（内容由AI生成，仅供参考）*
