---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: 6e300d47393ccbbdb5ddea648378e4bb_a7775814a15111f1a54f525400f8a581
    ReservedCode1: sCIBFhVHzHUKUxY7Q8FzU0rxgU2D3kFAkuHwSwMXBrfljgJK/acLM+1R95XqXNupQ2yr/7Y/t+78vICd4AjERS3rkrw0ue7lABtWLo+WDSfPGKRpLhz/Z6ODgOPM2sDtI6aAetAgunpRHLlHn6F8anpnK6cu8YtPcQvqSjHGHyGfwJPT9ELmMlKjSAE=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: 6e300d47393ccbbdb5ddea648378e4bb_a7775814a15111f1a54f525400f8a581
    ReservedCode2: sCIBFhVHzHUKUxY7Q8FzU0rxgU2D3kFAkuHwSwMXBrfljgJK/acLM+1R95XqXNupQ2yr/7Y/t+78vICd4AjERS3rkrw0ue7lABtWLo+WDSfPGKRpLhz/Z6ODgOPM2sDtI6aAetAgunpRHLlHn6F8anpnK6cu8YtPcQvqSjHGHyGfwJPT9ELmMlKjSAE=
---

# nocau.com 安全审查清单（边写边查）

> 由后端运维 Agent 维护。新增/修改代码后对照检查，命中任一项即修复后再合并。
> 检查状态：✅ 通过 / ❌ 需修复 / ➖ 不适用

## 一、通用

- [ ] 无硬编码密钥（API Key / Token / 密码一律走环境变量）
- [ ] 无敏感文件被 git 跟踪（`.env`、`data/`、`node_modules/`、`temp/`）
- [ ] 所有用户输入均经过校验（长度 + 格式 + 白名单）
- [ ] 所有输出均经过转义（textContent / 模板转义），无直接 innerHTML 拼接用户数据
- [ ] 页面自带 CSP meta（`script-src 'self'`，无内联脚本）
- [ ] 无外部不可信脚本 / CDN 依赖（或已列入 CSP 白名单）

## 二、后端（server/）

- [ ] 数据库查询全部参数化（禁字符串拼接 SQL）
- [ ] 管理接口有 Bearer Token 鉴权且 Token 为强随机串
- [ ] 公开接口有限流（express-rate-limit）
- [ ] 请求体大小限制（16kb 内）
- [ ] helmet 安全头生效（无 X-Powered-By、nosniff、frame DENY）
- [ ] CORS 白名单未放开为 `*`
- [ ] 错误响应不泄露堆栈 / 内部路径
- [ ] 登录/鉴权比较使用固定时间比较

## 三、依赖与部署

- [ ] `npm audit` 无高危漏洞
- [ ] 生产环境 NODE_ENV=production，静态资源开启缓存
- [ ] 反代环境 TRUST_PROXY 正确设置
- [ ] HTTPS 已启用（生产）
- [ ] 数据库文件有备份策略

## 四、内容与遗漏

- [ ] 联系表单有真实提交入口（后端接收），无"假按钮"
- [ ] 全站无死链（404 页面兜底）
- [ ] 页面无占位信息外泄（示例邮箱 / 假链接）
- [ ] `temp/` 截图等临时文件未进入发布目录

---
## 检查记录

| 日期 | 范围 | 结果 | 处理人 |
| --- | --- | --- | --- |
| 2026-08-26 | 全站静态审查 + 后端 v0.1 | ✅ 通过（发现项已修复/记录） | Marvis |

