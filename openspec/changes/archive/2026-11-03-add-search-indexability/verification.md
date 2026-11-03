# Verification

## Scope

2026-11-03（Asia/Shanghai）完成本地技术验证。构建来源为 `https://sameword.example.com/`，规范首页为同一地址。
浏览器使用独立的 Chromium 配置、仅指向 `127.0.0.1` 的主机解析和临时自签证书，检查本地 Nginx 与 `pnpm start`，没有发布到公网。

## Results

| 检查                                                       | 结果                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm build`                                               | 通过；包含导入边界、客户端/测试/服务端类型检查及生产产物                                                                                         |
| `pnpm lint`                                                | 通过                                                                                                                                             |
| `pnpm test:network`                                        | 8/8 通过；新增检查覆盖 GET/HEAD、首页别名、未知路径、无效房间、Socket.IO polling 和客户端脚本                                                    |
| `pnpm exec tsx --test src/client/i18n/messages.test.ts`    | 6/6 通过；包含首页中文、邀请入口检测、手选偏好及受限存储                                                                                         |
| `pnpm exec tsx --test scripts/search-indexability.test.ts` | 1/1 通过；翻译中的特殊字符、`$&` 与 `$$` 在正文和结构化数据中保持原值                                                                            |
| `openspec validate add-search-indexability --strict`       | 通过；apply 状态为 `all_done`，30/30 任务完成                                                                                                    |
| 最终差异与文档                                             | `git diff HEAD --check` 通过；40 个本地文档链接目标存在；最后重新生成的首页 HTML 与浏览器验收产物字节一致                                        |
| 来源校验                                                   | 19 个缺失、非法、非 HTTPS、本地、示例、凭据、路径、查询和片段配置拒绝；合法来源规范化和无公开来源的开发配置通过                                  |
| Nginx 1.30.6（Windows）                                    | 用本地目录和临时证书替换部署参数后 `nginx -t` 通过                                                                                               |
| 两条托管链路                                               | 24 个路径 × GET/HEAD 的 48 组响应比对通过；首页及参数变体无 `noindex`，其他响应有 `noindex`，别名 301，未知页面和无效/小写房间 404               |
| 压缩与缓存                                                 | 首页、JS、CSS、SVG、sitemap 的 gzip 解压内容与产物一致；资源缓存仍为一年；PNG 和 Node 预览不重复压缩                                             |
| Manifest                                                   | Node 与 Nginx 的 GET/HEAD 均为 `application/manifest+json` 并带 `noindex`；Nginx GET 可 gzip，全部图标地址可访问                                 |
| 浏览器                                                     | 全新 zh-CN/en-US × 320/1280px × 开启/关闭 JavaScript 共 8 组通过；默认中文、正文与示例完整、无重复正文/横向溢出/资源错误，主标题加载前后位置一致 |
| 语言与房间                                                 | 手选英文刷新保留；中英文浏览器的邀请入口语言正确；一个浏览器创建房间，另一个全新英文浏览器通过合法邀请加入                                       |
| 元数据与发现文件                                           | canonical、中文标题/描述、Open Graph、Twitter、可解析的 WebApplication 数据同源；sitemap XML 仅一个无参数首页；robots 允许抓取并声明绝对 sitemap |
| 图片                                                       | favicon 32×32、Apple 180×180、Manifest 图标 192×192/512×512、分享图 1200×630；直接打开 SVG 正常，中文图片目视可读                                |
| 生成与安全边界                                             | 缺字体文件直接失败；按 README 命令重生成成功且分享图字节不变；文本、属性与 JSON 的特殊字符转义通过；缺少发布资源使发布检查失败                   |

## Link Preview

使用 Playwright 本地链接预览检查器读取构建 HTML 的标题、描述、卡片类型、绝对图片地址和替代文字，并渲染卡片。
图片可访问、类型为 PNG、中文可读；截图位于 [link-preview.png](../../../.local/search-check/link-preview.png)。
窄屏无脚本与桌面有脚本截图分别位于 [home-320-en-US-false.png](../../../.local/search-check/home-320-en-US-false.png) 和 [home-1280-en-US-true.png](../../../.local/search-check/home-1280-en-US-true.png)。
临时检查器与截图存于忽略的 `.local/search-check/`，不属于发布资源；本地卡片检查不证明外部平台一定展示卡片。

## Limitations

- pnpm 的脚本前依赖检查报告原有 `fastify@5.12.8` 未满足 `minimumReleaseAge`；实际构建、lint 与测试命令退出码均为 0。已核对安装版本一致，未修改该策略；全新依赖安装尚待策略允许后验证。
- 真实来源上的大陆网络、真实手机、部署后的资源与压缩、百度/Bing 站点验证和提交，以及抓取、收录、误收录、展现和点击仍按 README 上线清单执行。没有把本地技术检查或提交计划记录为实际收录结果。
