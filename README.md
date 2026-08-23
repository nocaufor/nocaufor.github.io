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

高级科技风个人开发者作品集静态网站（nocau 品牌）。纯 HTML / CSS / JS，零构建、
零后端依赖，可直接部署到 GitHub Pages，绑定自定义域名 nocau.com。

## 功能特性

- **高级科技风视觉**：深色渐变 + 霓虹点缀 + 玻璃拟态，浅色模式适配
- **粒子网络动态背景**：Canvas 粒子连线 + 鼠标交互，页面隐藏自动暂停
- **打字机标题**：多文案轮播效果
- **数字统计动画**：Hero 数据平滑滚动计数
- **技能进度条**：滚动进入视口后动画填充
- **项目筛选**：按 全部 / 微信小程序 / Android / AI 平台 分类切换
- **主题切换**：深色 / 浅色一键切换，localStorage 记忆
- **响应式布局**：桌面网格 → 移动端汉堡菜单
- **平滑滚动 + 滚动渐入动画**：IntersectionObserver 驱动
- **回到顶部**：滚动超过阈值后悬浮按钮
- **表单校验**：姓名 / 邮箱 / 留言前端校验 + 错误提示
- **404 页面**：GitHub Pages 自定义 404

## 页面结构

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `index.html` | Hero、打字机、统计、能力、技术栈、精选项目、CTA |
| 作品集 | `projects.html` | 4 个项目卡片 + 分类筛选（衣件通 / 好友检测 / LINGO 广告拦截 / AI hub） |
| 关于 | `about.html` | 个人简介、技能进度条、经历时间线、理念 |
| 联系 | `contact.html` | 联系方式 + 纯前端留言表单 |
| 404 | `404.html` | 自定义 404 页 |

## 目录结构

```
portfolio-site/
├── index.html            # 首页
├── projects.html         # 作品集
├── about.html            # 关于
├── contact.html          # 联系
├── 404.html              # 404 页面
├── CNAME                # 自定义域名（nocau.com）
├── README.md             # 本文档
├── assets/
│   ├── css/
│   │   └── style.css     # 全局样式（设计变量 + 双主题 + 响应式 + 动画）
│   ├── js/
│   │   └── main.js       # 全部交互脚本（无依赖原生 JS）
│   └── img/              # 图片资源目录（当前占位说明）
└── pages/                # 预留：未来多页面/子页面目录
```

## 快速开始（本地预览）

直接用浏览器打开 `index.html` 即可，无任何构建步骤。

如需本地静态服务器：

```bash
# 任选其一
python -m http.server 8000
npx serve .
```

## 部署到 GitHub Pages

1. 新建仓库（如 `nocau.github.io` 或任意项目仓库），推送本项目全部文件。
2. 仓库 Settings → Pages → Source 选择分支（如 `main` / `gh-pages`）与根目录。
3. 绑定自定义域名：
   - 仓库根目录已含 `CNAME`，内容为 `nocau.com`，无需改动；
   - 在 Settings → Pages → Custom domain 填写 `nocau.com`；
   - 在 DNS 服务商添加 CNAME 记录：`nocau.com → 你的用户名.github.io`。
4. 部署完成，访问 `https://nocau.com`。

## 内容定制

- **个人信息**：修改各页面中的姓名、简介、联系方式（`contact.html` 中的邮箱 / GitHub / 微信为占位内容）。
- **项目卡片**：编辑 `projects.html` 中 `.project-card` 区块，替换占位链接为真实仓库或详情页地址。
- **主题色**：修改 `assets/css/style.css` 顶部 `:root` 中的品牌色变量，全站自动换肤。
- **打字机文案**：修改 `assets/js/main.js` 中 `initTypewriter` 的 `phrases` 数组。
- **项目封面**：默认使用渐变色块 + 文字占位；将图片放入 `assets/img/` 后替换 `.project-cover` 内样式即可。

## 未来升级为公司官网（预留扩展）

- **导航扩展**：新增页面后同步 HTML 导航即可，导航结构集中维护在 `.nav-links`。
- **品牌区**：`.brand` 区块可扩展为 Logo + 品牌名 + Slogan 的公司级品牌区。
- **多页面目录**：`pages/` 目录已预留，未来可将公司介绍、团队、服务、新闻等页面放入该目录组织。
- **资源路径**：全站采用相对路径，子目录页面无需修改资源引用。

## 技术栈

- HTML5 语义化
- CSS3：Flexbox / Grid / CSS Variables / 双主题 / Media Queries / 动画
- 原生 JavaScript（Canvas 粒子、IntersectionObserver、localStorage，无框架无依赖）
*（内容由AI生成，仅供参考）*
