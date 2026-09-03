---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_c26bc0ea9ecc11f1a413525400287e28
    ReservedCode1: ky90rSzs3uu8ryejrRoGbhyOkCCjRnz0nzbEm9IZDrk1NZeIx6K2lYlWJ9obHrLZ5df3+T7pz2Gs7uAioT66237oo3WsDifZFOtgUnghuSx2tauk4udNiVcgKv1r5C2LkR0oavhzyHHsIn1MUMKFagtdHlSCoz+8BXyDpxETl6ymvV7Kw4SF9C4rh5w=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_c26bc0ea9ecc11f1a413525400287e28
    ReservedCode2: ky90rSzs3uu8ryejrRoGbhyOkCCjRnz0nzbEm9IZDrk1NZeIx6K2lYlWJ9obHrLZ5df3+T7pz2Gs7uAioT66237oo3WsDifZFOtgUnghuSx2tauk4udNiVcgKv1r5C2LkR0oavhzyHHsIn1MUMKFagtdHlSCoz+8BXyDpxETl6ymvV7Kw4SF9C4rh5w=
---
# nocau.com — 个人开发者作品集

开发者 LINGAo 的个人作品集站点，托管于 GitHub Pages，绑定自定义域名 www.nocau.com。
全站纯静态：HTML + CSS + 原生 JavaScript，无框架、无构建步骤、零外部运行时依赖，可直接部署运行。

## 站点内容

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `index.html` | 站点总览：开发者简介、能力方向、核心统计与各板块入口 |
| 代码开发 | `fun/index.html` | 67 个可独立运行的代码页面合集，按用途分为娱乐代码、功能代码、实用代码三类 |
| 想法项目 | `ideas.html` | 可供实现的软件项目方案清单，覆盖工具、AI 应用、社交、效率与本地应用，标注全流程困难与难点 |
| 星空数据库 | `star-db.html` | 以 3D 星空形式汇总全部代码项目与想法方案（当前 123 颗星），支持筛选、搜索、排序与详情展开 |
| 关于 | `about.html` | 开发者身份与技术方向 |
| 联系 | `contact.html` | 邮箱、微信、GitHub 与留言表单 |
| 定制服务 | `services.html` | 根据实际需求定制个人工具包：自动化脚本、效率工具、数据处理、本地小工具、微信小程序与 Android 应用 |
| 404 | `404.html` | GitHub Pages 自定义 404 页 |

代码开发合集内的每个页面均为独立 HTML + 外部 JS，可脱离合集单独打开运行；CSP 兼容、零依赖。

## 功能特性

- 视觉风格：极简未来风，黑白灰为主、低饱和青色点缀，深浅双主题一键切换
- 中英双语：全站文案通过 `assets/js/i18n.js` 统一管理，一键切换语言
- 3D 星空可视化：Canvas 3D 呈现项目与想法的全量关系，支持筛选、搜索、排序
- 想法方案库：分区布局 + 分类筛选 + 详情面板，方案均标注实现难度与关键难点
- 响应式布局：桌面网格到移动端折叠菜单自适应
- 动效与交互：滚动渐入、分区揭示、粒子星空等轻量动效，页面隐藏时自动暂停以节省资源
- 表单校验：联系页留言表单前端校验与提交

## 目录结构

```
portfolio-site/
├── index.html / ideas.html / star-db.html
├── about.html / contact.html / services.html
├── projects.html          # 旧版作品集页（未接入主导航，保留）
├── 404.html
├── fun/                   # 代码开发合集
│   ├── index.html         # 合集入口与分组
│   ├── fun.css
│   ├── css/               # 页面共享样式
│   ├── js/                # 页面共享脚本与各页面逻辑
│   └── *.html             # 67 个可独立运行的代码页面
├── assets/
│   ├── css/               # style / home / ideas / star-db / stars3d / services 等分页样式
│   ├── js/                # i18n / ideas / star-db / stars3d / gesture / contact 等逻辑
│   └── img/               # Logo / favicon 等静态资源
├── pages/                 # 预留：未来子页面 / 扩展页面目录
├── server/                # 可选后端（Express + SQLite）：静态托管 + 联系表单接口
├── SECURITY-CHECKLIST.md  # 部署安全检查清单
├── CNAME                  # 自定义域名（www.nocau.com）
└── README.md              # 本文档
```

## 本地预览

直接用浏览器打开 `index.html` 即可；或启动本地静态服务器：

```bash
# 任选其一
python -m http.server 8000
npx serve .
```

## 部署到 GitHub Pages

1. 将仓库推送至 GitHub（如 `nocaufor.github.io`）。
2. 仓库 Settings → Pages → Source 选择 `main` 分支与根目录。
3. 自定义域名：仓库根目录已包含 `CNAME`（`www.nocau.com`）；在 DNS 服务商将 `www` 解析为 `nocaufor.github.io`，并视需要在 Settings → Pages → Custom domain 中同步填写。
4. 部署完成，访问 `https://www.nocau.com`。

## 可选后端：联系表单服务

纯静态部署时无需后端，联系页留言表单可直接前端提交。
若需接收并管理留言，可启用 `server/` 下的 Express 服务：

```bash
cd server
npm install
cp .env.example .env   # 按需填写配置
npm start
```

技术栈：Node.js >= 18、Express 4、node:sqlite（零原生编译）、helmet、express-rate-limit、cors、dotenv。

## 内容维护

- 各页面的标题、描述与导航文案：`index.html` 及各页面 `<head>` / `<nav>` 区域；
- 中英双语文案：统一维护在 `assets/js/i18n.js`；
- 代码开发合集：在 `fun/` 新增独立页面，并同步登记到 `fun/index.html` 对应分组；
- 星空数据库数据：维护 `assets/js/star-data.js`，新增项目或想法后同步更新。

*（内容由AI生成，仅供参考）*