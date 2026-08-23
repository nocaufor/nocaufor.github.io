---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_82bcdc079e4711f1a54f525400f8a581
    ReservedCode1: VM0UhkX/gxjnv0mU6KCTWFBpBHNoNusP33xeIIQXw1xeXKQMgCGcQ3Ju13AIeldVKCnp0y/pxEf5gMe9w3k7d+OF196P+AQZ9TTcxgHFz9Jdv9E/e+GWkbXRrHJ8VbwP8Lrhok9kBWloE7AIiXjC8Mrh56QvpD9/SVQq2iwQ5CTjfMNSbpnhsES7xOY=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_82bcdc079e4711f1a54f525400f8a581
    ReservedCode2: VM0UhkX/gxjnv0mU6KCTWFBpBHNoNusP33xeIIQXw1xeXKQMgCGcQ3Ju13AIeldVKCnp0y/pxEf5gMe9w3k7d+OF196P+AQZ9TTcxgHFz9Jdv9E/e+GWkbXRrHJ8VbwP8Lrhok9kBWloE7AIiXjC8Mrh56QvpD9/SVQq2iwQ5CTjfMNSbpnhsES7xOY=
---

# Portfolio Site - 个人开发者作品集

现代风格的个人开发者作品集静态网站模板。纯 HTML / CSS / JS，无后端依赖，
可直接部署到 GitHub Pages，并支持自定义域名（.com）。

## 页面结构

| 页面 | 路径 | 说明 |
| --- | --- | --- |
| 首页 | `index.html` | Hero 简介、核心能力、技术栈、精选项目 |
| 作品集 | `projects.html` | 4 个项目卡片（衣件通 / 好友检测 / LINGO 广告拦截 / AI hub） |
| 关于 | `about.html` | 个人简介、经历时间线、理念 |
| 联系 | `contact.html` | 联系方式 + 纯前端留言表单 |
| 404 | `404.html` | GitHub Pages 自定义 404 页 |

## 目录结构

```
portfolio-site/
├── index.html            # 首页
├── projects.html         # 作品集
├── about.html            # 关于
├── contact.html          # 联系
├── 404.html              # 404 页面
├── CNAME                # 自定义域名（nocau.com）
├── assets/
│   ├── css/
│   │   └── style.css     # 全局样式（设计变量 + 响应式）
│   ├── js/
│   │   └── main.js       # 交互脚本（导航、动画、表单校验）
│   └── img/              # 图片资源目录（项目封面等，当前占位）
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

1. 新建仓库（如 `yourname.github.io` 或任意项目仓库），推送本项目全部文件。
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
- **项目封面**：默认使用渐变 + 文字占位；将图片放入 `assets/img/` 后替换 `.project-cover` 内样式即可。

## 未来升级为公司官网（预留扩展）

- **导航扩展**：`assets/js/main.js` 顶部 `SITE_CONFIG.navItems` 集中维护导航；新增页面后同步 HTML 导航。
- **品牌区**：`.brand` 区块可扩展为 Logo + 品牌名 + Slogan 的公司级品牌区。
- **多页面目录**：`pages/` 目录已预留，未来可将公司介绍、团队、服务、新闻等页面放入该目录组织。
- **资源路径**：全站采用相对路径，子目录页面无需修改资源引用。

## 技术栈

- HTML5 语义化
- CSS3：Flexbox / Grid / CSS Variables / Media Queries / 暗色模式适配
- 原生 JavaScript（无框架、无依赖）
*（内容由AI生成，仅供参考）*
