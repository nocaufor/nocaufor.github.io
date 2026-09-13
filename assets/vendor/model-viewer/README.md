---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_d057904fadef11f18874525400287e28
    ReservedCode1: y0kiH9yz8/vkKtL1JBNUxGn1KaVQxW2wsdwyzom0ur7In5wJT5IreQuPB9Ha/OLJv/tItMF0N60+l3z6Qy7WSqbHD8fV5uNJbk39Zv6YaNgdv7G6qkD22EvhicaqawUylss/trZLdDsUYrCEBzcH+7bwLToVgT0jv0fDDJjptuZ3zhdOEyqO5cGX+78=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_d057904fadef11f18874525400287e28
    ReservedCode2: y0kiH9yz8/vkKtL1JBNUxGn1KaVQxW2wsdwyzom0ur7In5wJT5IreQuPB9Ha/OLJv/tItMF0N60+l3z6Qy7WSqbHD8fV5uNJbk39Zv6YaNgdv7G6qkD22EvhicaqawUylss/trZLdDsUYrCEBzcH+7bwLToVgT0jv0fDDJjptuZ3zhdOEyqO5cGX+78=
---

# model-viewer（本地化副本）

| 项 | 说明 |
| --- | --- |
| 组件 | `@google/model-viewer`（Web Component `<model-viewer>`） |
| 版本 | 4.3.1 |
| 来源 | https://github.com/google/model-viewer · https://modelviewer.dev |
| 授权 | BSD-3-Clause（内嵌 three.js 部分为 MIT） |
| 本地文件 | `model-viewer.min.js`（约 1.02 MB，官方 UMD 产物镜像） |

## 为什么本地化

首页首屏主视觉由该组件渲染；境外 CDN 在部分网络环境下会长时间 LOADING，
故镜像到仓库内自托管，页面运行时不请求任何外部 CDN（CSP 亦未放开外部 script 源）。

## 引入方式（index.html）

```html
<script type="module" src="assets/vendor/model-viewer/model-viewer.min.js"></script>
```

组件不在 HTML 中直接实例化，而是由 `assets/js/home-new.js` 的 `initModel()`：

1. 检测 WebGL 可用性；
2. 可用 → 从 `#tk-model-tpl` 模板克隆 `<model-viewer>` 插入 `.tk-orb-stage`，首帧就绪后移除 `.tk-no-3d`（CSS 静态雕塑淡出）；
3. 不可用 → 完全不实例化该组件，保留 CSS 静态雕塑首帧（零控制台报错）。

## 升级方式

```
npm pack @google/model-viewer@<version>
# 解包后用 package/dist/model-viewer.min.js 覆盖本目录同名文件
```
*（内容由AI生成，仅供参考）*
