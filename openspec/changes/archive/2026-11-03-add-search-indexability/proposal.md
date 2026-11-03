# Proposal

## Why

站点首页的正文依赖 JavaScript，缺少描述、规范地址与发现文件，不利于中文搜索引擎理解和展示；Nginx 还会把未知路径作为 200 首页返回，一次性房间链接也没有排除索引信号。本变更只将中文首页 `/` 作为搜索入口，补齐抓取、内容和上线验证条件；收录、排名与流量由搜索引擎决定，不以配置完成代替实际效果。

## What Changes

- 新增 `robots.txt`，允许抓取以读取页面与响应头中的索引指令，并声明 sitemap 的绝对地址；不使用 `Disallow` 代替禁止索引。
- 新增 `sitemap.xml`，始终只包含规范首页 `/` 一个条目；不自动纳入其他页面、房间、接口、静态资源或语言路由。
- 在构建期把首页的可见正文注入 `index.html` 的 `#root`，包含品牌、多人联机文字联想游戏的说明与玩法示例；文案来自现有语言包，同样呈现给正常用户。
- 首次直接访问首页且没有手动语言选择时固定使用中文，使执行脚本前后的默认首页正文、标题与语言声明一致；保留手动切换和记忆，邀请入口继续按浏览器语言选择。
- 在 `index.html` 中补齐索引与分享所需元数据：`description`、`canonical`、Open Graph 与 Twitter 卡片、站点图标与 Web App Manifest，以及首页的 WebApplication 结构化数据。
- 新增可手改的 SVG 品牌图标源文件，并用一次性脚本光栅化出 PNG 图标与 Open Graph 分享图；产物提交到仓库，构建不依赖位图生成工具。
- 首页响应不得包含 `noindex`；其他 URL 的 HTTP 响应统一携带 `X-Robots-Tag: noindex`，房间功能保持可用。未知页面返回真正的 404，外部请求 `/index.html` 永久重定向到 `/`，避免首页别名形成独立搜索入口。
- 在 Nginx 生产托管中启用文本资源 gzip 压缩；Node 本地生产预览只对齐路由与索引指令，不承担压缩验收。
- 复用现有 `PUBLIC_ORIGIN` 作为唯一构建来源，通过 Vite 的环境加载能力读取仓库根目录配置；缺失、非法、本地或示例来源直接导致生产构建失败。
- 在 README 提供简短的中文搜索发布入口，在 `docs/search-indexability.md` 补齐上线清单：大陆网络与移动端可达性、目标引擎验证与仅首页提交、抓取诊断、索引及搜索流量观察。优先百度，并检查 Bing 中文搜索；其他引擎按实际可用能力补充。
- **BREAKING**：生产构建必须配置真实 HTTPS 公网来源；Nginx 与 Node 不再对未知页面回退首页，无效或小写房间码返回 404；无手选偏好的首次首页访问不再自动切为英文。

## Capabilities

### New Capabilities

- `search-indexability`: 只将规范首页作为搜索入口，定义发现文件、中文索引内容、分享资源、其他 URL 的排除索引响应与上线效果验证。

### Modified Capabilities

- `client-localization`: 无手选偏好的首次首页访问默认中文；邀请入口的浏览器语言检测、手动选择、持久化与游戏状态语义保持不变。

## Impact

- `src/client/index.html`：补齐元数据、图标与 Manifest 引用，并留出正文注入位置。
- `vite.config.ts`：加载并校验 `PUBLIC_ORIGIN`，从语言包生成静态正文、发现文件与绝对 URL 元数据。
- `src/client/home-screen.tsx`、`src/client/i18n/messages.ts`：补足可见游戏说明与示例，保持静态正文和客户端文案一致、两种语言键集合一致。
- `src/client/i18n/locale.tsx`：调整首次首页访问的默认语言，不按爬虫身份返回不同内容。
- `src/client/public/`（新增）：站点图标、Web App Manifest 与 Open Graph 图；`robots.txt` 与 `sitemap.xml` 由构建生成。
- `scripts/`（新增）：图标与分享图的一次性光栅化脚本。
- `deploy/nginx.conf`：明确首页与房间路由、首页别名重定向、非首页的 `X-Robots-Tag`，并启用 gzip。
- `src/server/app.ts`：对齐房间码约束、首页别名重定向与全部非首页响应的索引指令。
- `package.json`、`.env.example`、`README.md`、`docs/search-indexability.md`：资源脚本、必填构建来源说明、简短发布入口与中文搜索上线清单。
- 新增位图生成工具为 `devDependency`，只在重新生成图片时使用，不参与 `pnpm build`。
- 本次不包含：其他可索引页面、URL 语言前缀、`hreflang`、英文独立索引、服务端渲染框架、房间邀请预览卡片、游戏规则变更，以及排名或流量保证。
