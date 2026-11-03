# 搜索索引与发布检查

本页补充 [部署说明](./deployment.md)，区分本地技术检查、公网抓取、实际收录和自然搜索流量。

## 来源与索引边界

- 复制 `.env.example` 为 `.env`，把 `PUBLIC_ORIGIN` 设为真实公网 HTTPS 来源，例如 `https://sameword.example.com`。构建与运行时使用同一个来源；末尾 `/` 会规范化，不能包含凭据、其他路径、参数或片段。本地地址、示例域名、缺失或非法值会让生产构建失败。
- Vite 按 mode 从仓库根目录加载环境配置，进程环境变量优先。`pnpm dev` 不需要公开来源。本地 `pnpm start` 仍可打开 `http://127.0.0.1:3000`，但产物中的 canonical 与分享地址保留真实来源，不会改为本地地址；本地游戏交互检查需将该 HTTPS 来源转发到本地服务，才能通过同源校验并使用 Secure Cookie。
- 生产会话 Cookie 启用 Secure、HttpOnly 与 SameSite=Strict，公开服务必须经过 HTTPS。
- 只能运行一个进程，不启用 Node cluster 或多副本；状态全部在内存，重启会清空进行中的房间。
- Nginx 反向代理示例见 [`deploy/nginx.conf`](../deploy/nginx.conf)，`/api/`、`/socket.io/` 与 `/health` 转发到 Node。
- 只有 `/` 是搜索入口，带参数首页的 canonical 仍为无参数首页。`/index.html` 以 301 归并到 `/`；其他响应统一带 `X-Robots-Tag: noindex`，包括房间、接口、发现文件、图片与错误响应。爬虫仍可抓取这些地址以读取指令和加载依赖。
- 只有 `/rooms/[A-Z2-9]{6}` 返回邀请页；格式合法但失效的邀请显示既有失效状态，小写、无效房间码、未知页面与 `/en/` 返回真正的 404，不再回退首页。
- Nginx 对 HTML、脚本、样式、XML、SVG 等文本启用 gzip，PNG 不重复压缩；`/assets/` 继续缓存一年，页面继续 `no-cache`。Node 本地生产预览不启用压缩。

首次直接打开首页且没有手选语言时，中文与英文浏览器都显示中文；邀请入口继续按浏览器语言选择。页头手动选择会立即生效并记忆，刷新后优先使用。构建只读取无 DOM 依赖的语言数据，静态正文与客户端介绍、邀请说明、规则和示例共用 `src/client/i18n/messages.ts`。

正常开启 JavaScript 时，规则与示例从入房卡片标题右侧的“怎么玩？”按钮打开对话框查看；无 JavaScript 时，生产首页通过 `noscript` 直接展示相同内容。构建首页不写入重连提示，连接状态预留位置与客户端一致，390px 以下不占位；右上方的仓库、语言和主题图标按钮及标题对齐方式也在构建 HTML 中保持一致。工具栏 SVG 图标由 `src/client/public/toolbar-icons.svg` 提供，并随构建复制到发布目录。

## 品牌图片

`src/client/public/icon.svg` 是图标的唯一设计源。使用 [Noto Sans SC](https://github.com/notofonts/noto-cjk) 中文字体文件重新生成 PNG 图标与 1200×630 分享图：

```sh
pnpm build:images /path/to/NotoSansSC-Regular.otf
```

Windows 已安装该字体时可使用 `pnpm build:images "C:/Windows/Fonts/Noto Sans SC (TrueType).otf"`。缺少字体文件会直接失败；不静默使用替代字体。将 SVG、PNG 与 Manifest 一起提交到版本控制。图片仅在品牌或文案变化时重做，`pnpm build` 不运行位图工具，部署构建无需额外字体；缺少必需分享资源会导致构建失败。

## 中文搜索上线检查

对同一份生产构建分别检查 Node 预览与 Nginx 部署。Nginx 先运行 `nginx -t`，更新服务器名、证书与静态目录后再发布。以下命令用真实部署来源执行，GET 与 HEAD 均须核对状态、`Location` 和 `X-Robots-Tag`：

```sh
SITE=https://sameword.example.com
for path in / '/?source=check' /index.html /rooms/ABCDEF /rooms/ZZZZZZ /rooms/abc /rooms/abcdef /unknown /en/ /robots.txt /sitemap.xml /site.webmanifest /icon.svg /icon-32.png /apple-touch-icon.png /icon-192.png /icon-512.png /og-image.png /health /api/rooms/ABCDEF '/socket.io/?EIO=4&transport=polling'; do
  curl -sS -D - -o /dev/null "$SITE$path"
  curl -sSI "$SITE$path"
done
curl -fsSL -D - -o /dev/null "$SITE/index.html"
```

| 请求                                                | 预期                                                          |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `/` 及首页参数变体                                  | 200，无 `noindex`；canonical 为 `${SITE}/`                    |
| `/index.html`                                       | 301 到 `/`，有 `noindex`；跟随后首页无 `noindex`              |
| 合法、仍有效或已失效的六位大写邀请                  | 200、有 `noindex`；实际有效邀请仍可加入，失效邀请显示失效提示 |
| 无效房间、未知页面、未定义语言路由                  | 404、有 `noindex`                                             |
| 发现文件、Manifest、全部图标、分享图与构建脚本/样式 | 200、正确类型、有 `noindex`                                   |
| 接口与 Socket.IO 普通 HTTP 端点                     | 保持业务状态码、有 `noindex`，包括拒绝和错误响应              |

- 从大陆网络和真实手机打开真实来源，无登录或交互验证即可获取页面及依赖；检查 320px 与 1280px 布局。分别以全新 `zh-CN`、`en-US` 浏览器开关 JavaScript，核对中文品牌、介绍、邀请说明、规则、示例，无重复正文与明显跳变；开启脚本后切换语言、刷新并完成创建和邀请加入。
- 解析真实响应 HTML，核对中文标题/描述、`lang="zh-CN"`、同源 canonical、Open Graph、Twitter 和可解析的 WebApplication 数据；用可用的链接预览工具记录读取结果。检查图像可读、尺寸和图片类型，任一引用资源缺失即发布验收失败；外部平台是否展示卡片另行观察。
- `robots.txt` 必须是允许抓取及绝对 sitemap 声明的纯文本，不能用 HTML 顶替；sitemap 始终只有无参数规范首页一个 `<loc>`，不得加入房间、资源、别名或其他语言 URL。
- 从 HTML 取实际 JS/CSS 的哈希路径，执行 `curl -sSI "$SITE/assets/<实际文件>"` 确认缓存仍为一年；执行 `curl -sS --compressed -D - "$SITE/assets/<实际文件>" -o /tmp/sameword-asset` 检查 gzip，并与 `dist/client/assets/<实际文件>` 比对解压后的内容。SVG 同样检查 gzip；PNG 不应有 gzip 编码。不要以 HEAD 的长度代替 GET 压缩检查。
- 本地检查通过不能代替公网抓取诊断，也不能证明已收录或已有搜索流量。

在 [百度搜索资源平台](https://ziyuan.baidu.com/) 与 [Bing Webmaster Tools](https://www.bing.com/webmasters/) 按当前入口完成站点验证，可用 DNS 或平台验证文件。文件放入 `src/client/public/` 后重建，以普通静态资源提供，不新增可索引页面，不提交或长期保存推送凭据。**只提交 `${SITE}/`**；有 sitemap 权限时提交 `${SITE}/sitemap.xml`，其中仍只有首页一条。没有权限或入口时记录限制与待办，不提交其他路由。其他引擎按实际可用能力补充。

每个平台在发布时、发布后一周和一个月手动补充下表。初始观察查询可用“同词相遇”“多人联机文字游戏”“默契联想游戏”，不假定它们已有搜索量。无数据就记无数据；首页未收录时保留抓取诊断和后续动作，非首页误收录时使用对应平台实际可用的删除或诊断入口。提交成功、资源可访问或单独 `site:` 查询都不能证明索引、排名与流量。

| 平台 | 检查时间及阶段 | 验证方式/权限限制 | 仅首页提交方式与结果 | 抓取诊断及待办 | 首页索引状态 | 非首页误收录 | 中文查询/展现/点击 |
| ---- | -------------- | ----------------- | -------------------- | -------------- | ------------ | ------------ | ------------------ |
| 百度 | 待记录         | 待记录            | 待记录               | 待记录         | 待观察       | 待观察       | 无数据             |
| Bing | 待记录         | 待记录            | 待记录               | 待记录         | 待观察       | 待观察       | 无数据             |
