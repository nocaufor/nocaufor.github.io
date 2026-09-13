---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_ad3b9194aeb011f1b128525400f8a581
    ReservedCode1: f/iKiobIqzVk/hnaMO0cbzIS3G8qbZ+uZ+PlNiR/e7mLJfqMwp3zicPpJpZ3Kafu+gzqLkOJcAd0O8ssnH8Pz6zGZUSF5UijaGzBWNVNUZdKOb1sQKTIGs6RA1I+X8kbgJafhn8KJbA4PCCnLEEhpEF8CnHfryth82cdGsgYXH/kuTTXDM7ufYn++y8=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_ad3b9194aeb011f1b128525400f8a581
    ReservedCode2: f/iKiobIqzVk/hnaMO0cbzIS3G8qbZ+uZ+PlNiR/e7mLJfqMwp3zicPpJpZ3Kafu+gzqLkOJcAd0O8ssnH8Pz6zGZUSF5UijaGzBWNVNUZdKOb1sQKTIGs6RA1I+X8kbgJafhn8KJbA4PCCnLEEhpEF8CnHfryth82cdGsgYXH/kuTTXDM7ufYn++y8=
---



---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_c451740cae6d11f18f50525400aeaaa3
    ReservedCode1: CrYmtVEKqMLUXKLKWubaG3oLrtbkEktcTS9KiTfiZoR4Dt+5H6jAt5iRicjDpg8oTPBEc2ShSfvbdlbsFSo1mqjnohdluFOWfV0bYl1y4BLP+nTflnJG6dq96yo8f/cHfgucaznAN/PTLjor9o+4hD9Pktjt7UYPUJVaoQlsDg/jQObaGtDNNbUgbqM=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_c451740cae6d11f18f50525400aeaaa3
    ReservedCode2: CrYmtVEKqMLUXKLKWubaG3oLrtbkEktcTS9KiTfiZoR4Dt+5H6jAt5iRicjDpg8oTPBEc2ShSfvbdlbsFSo1mqjnohdluFOWfV0bYl1y4BLP+nTflnJG6dq96yo8f/cHfgucaznAN/PTLjor9o+4hD9Pktjt7UYPUJVaoQlsDg/jQObaGtDNNbUgbqM=
---

---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_d21acfb6adef11f1b128525400f8a581
    ReservedCode1: ZrAa5IB8ogkUG+lSYuu3uHq0BYehHnmwOASL9L68HPBWwD/PHgkQSrPRTZcjKXfbhzeUoNL8yiYnIwJ+8ahAJjXe3+rHELqevKamTQOuvv23AXVENaJ+EYp+zbCDgPv8fLgp5BeJYPYspbl6nE5/3J8SqYOllZWMwEnTNTLtyrZcdoDPeoH13BoyjcM=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_d21acfb6adef11f1b128525400f8a581
    ReservedCode2: ZrAa5IB8ogkUG+lSYuu3uHq0BYehHnmwOASL9L68HPBWwD/PHgkQSrPRTZcjKXfbhzeUoNL8yiYnIwJ+8ahAJjXe3+rHELqevKamTQOuvv23AXVENaJ+EYp+zbCDgPv8fLgp5BeJYPYspbl6nE5/3J8SqYOllZWMwEnTNTLtyrZcdoDPeoH13BoyjcM=
---

# 首屏 3D 资源来源与授权

本目录资源用于首页（`index.html`）「方案 A：真 3D 模型 + 环境柔光」首屏主视觉，
全部本地自托管，页面运行时不请求任何外部 CDN。

> 现状（2026-09）：首屏 3D 主体为**站点自有几何资源** `nocau-orbits/`，材质已升级为**缎面金属**
> （釉面高光 + 环境反射层次），环境光改用本地 CC0 摄影棚 HDRI `env/studio_small_03_1k.hdr`。
> 原 Poly Haven 大理石胸像素材仍保留在本目录内作为素材备份与视觉参考，**页面不加载、不引用、未删除**。
> 另：**全页 3D 轨道图标只保留首屏主视觉一处**，首屏下方图标恢复为原 CSS 几何图标形态（不做 3D 化），消除图标重复与叠加。

## 1. 当前使用：NOCAU Orbits（站点自有轨道几何）

| 项 | 说明 |
| --- | --- |
| 来源 | 本站自有生成，非第三方素材 |
| 生成脚本 | `build_orbits_v2.py`（程序化构建，无外部依赖；v1 `build_orbits_gltf.py` 为原哑光陶瓷版） |
| 授权 | 归 NOCAU 站点所有，无第三方权利负担 |
| 本地文件 | `nocau-orbits/nocau-orbits.gltf`、`nocau-orbits/nocau-orbits.bin` |
| 几何构成 | sun / earth / moon 三球体，半径比 34 : 21 : 13（斐波那契比例），另含 2 条细线 torus 轨道 |
| 顶点规模 | 球体约 2925 顶点，双轨道约 2093 + 1243 顶点；`.bin` 约 220 KB |
| 材质 | 缎面金属：`metallic = 0.6`、`roughness = 0.3`、baseColor ≈ rgb(0.855, 0.875, 0.905)，并带 `KHR_materials_clearcoat`（釉面层）/ `KHR_materials_ior` / `KHR_materials_specular` 扩展，在本地摄影棚 HDRI 下形成高光与环境反射层次，褪去哑光塑料感 |

## 2. 保留素材（页面已不再引用，仅作备份 / 参考）

### 2.1 模型：Marble Bust 01（大理石胸像）

| 项 | 说明 |
| --- | --- |
| 来源 | Poly Haven · https://polyhaven.com/a/marble_bust_01 |
| 作者 | Rico Cilliers |
| 授权 | CC0（公共领域奉献，可商用 / 可修改，无需署名） |
| 本地文件 | `marble_bust_01/marble_bust_01_1k.gltf`、`marble_bust_01/marble_bust_01.bin`、`marble_bust_01/textures/marble_bust_01_{diff,rough,nor_gl}_1k.jpg` |
| 贴图规格 | 1K（源站最高 8K），模型目录合计约 0.86 MB |
| 保留原因 | CC0 无版权风险，作为首屏 3D 质感调校的参照物与素材备份保留，便于后续复用或回退 |

### 2.2 环境光：Studio Small 03（摄影棚柔光 HDRI）

| 项 | 说明 |
| --- | --- |
| 来源 | Poly Haven · https://polyhaven.com/a/studio_small_03 |
| 作者 | Greg Zaal |
| 授权 | CC0（公共领域奉献，可商用 / 可修改，无需署名） |
| 本地文件 | `env/studio_small_03_1k.hdr`（1K HDR，约 1.61 MB） |
| 使用状态 | **已启用**（2026-09 起）：首屏 `environment-image` 指向该 HDR，为缎面金属材质提供环境反射层次与高光细节；CC0 无版权风险、无署名义务 |

## 3. 使用方式

首页通过 `<model-viewer>` 引用（`assets/js/home-new.js` 的 `initModel()` 以模板实例化首屏主视觉）：

```
src="assets/models/nocau-orbits/nocau-orbits.gltf"
environment-image="assets/models/env/studio_small_03_1k.hdr"
```

**全页仅此一处 3D 轨道图标**：首屏下方图标区（`.tk-orb-badge`）不再实例化 3D 版本，
保持原 CSS 几何图标形态（`132px × scale(1.3)`）；`tk-badge-tpl` 模板与 `.tk-badge-model`、
`.tk-orb-badge.is-3d` 相关样式已移除，避免与主视觉重复、叠加。

渲染参数（随主题联动；`tone-mapping` 统一为 `neutral`）：

- 浅色主题：`exposure 1.02`、`shadow-intensity 1.05`、`shadow-softness 1`
- 深色主题：`exposure 0.98`、`shadow-intensity 1.35`、`shadow-softness 0.85`
- 低端设备（CPU ≤ 4 核或内存 ≤ 4G）：关闭自动旋转与相机交互，`shadow-intensity 0.6`、`exposure 1`

材质选型依据（2026-09 A/B 实测：缎面金属 / 磨砂半透玻璃 × 内建 `neutral` 环境 / 摄影棚 HDRI）：
缎面金属 + HDRI 在浅色与深色主题下高光层次、体积感最佳；磨砂半透玻璃在浅色底近乎隐形，未采用。

## 4. 版权结论

- **当前首屏 3D 主体为站点自有程序化几何，不存在第三方素材版权风险**，可自由商用与分发。
- 目录内保留的 Poly Haven 素材均为 **CC0（公共领域奉献）**，即使后续重新启用亦无授权负担、无署名义务。
- 本文件仅作来源与合规留档。

*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
