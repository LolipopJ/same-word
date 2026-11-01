# Same word · 同词

一个通过浏览器游玩的匿名多人联想游戏。服务端统一计时、隐藏作答并裁决计分。

## Development

需要 Node.js 24 和 pnpm 12。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://127.0.0.1:5173>。Vite 将 API 和 Socket.IO 代理到同源的 Fastify 服务（3000 端口）。

```sh
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test:rules
pnpm test:network
pnpm build
pnpm start
```

生产页面和 API 均由 <http://127.0.0.1:3000> 提供，`GET /health` 返回健康状态。
`src/client` 仅依赖共享协议；`pnpm typecheck` 同时检查浏览器和共享模块不可导入服务端状态。

`pnpm lint` checks JavaScript and TypeScript sources, tests, scripts, and configuration with
the recommended ESLint and TypeScript rules, React Hooks rules, Prettier formatting, and
`simple-import-sort` import/export ordering. `pnpm lint:fix` applies available automatic fixes.
Prettier uses single quotes as configured in `.prettierrc.json`; its recommended ESLint
integration disables conflicting formatting rules. Build output and local tooling directories
are excluded from linting.

## Architecture

- `src/client`：React、Vite、Tailwind CSS、daisyUI。
- `src/server`：Fastify、Socket.IO、内存会话和权威游戏规则。
- `src/shared`：Zod 命令校验、公开协议与统一词语规则。

只运行一个 Node.js 服务进程。所有状态保存在内存，重启会清空房间、会话、积分和历史。

## Play

1. 在两个独立浏览器（或普通窗口与隐身窗口）中打开页面，分别设置展示 ID。
2. 一人创建房间，另一人输入房间码或打开邀请链接加入。
3. 所有成员在线并点击准备后，倒数 3 秒开局，无须达到房间容量上限。等待中的未准备成员离开或过期移除后，也会按剩余成员重新检查开局条件。
4. 第一轮各自随意写一个词，计作第 1 轮。以后参考上一轮所有答案，寻找连接词。
5. 每轮最多成功提交一次；全员提前提交立即揭晓，否则到期未答者弃权。
6. 全员同词立即成功；结果页每人独立确认返回，全员重新准备开始新的一局。

默认容量 8 人、最多 20 轮、每轮 60 秒。词语去除首尾空白并忽略大小写；
`Apple` 与 `apple` 同词，`苹果` 与 `蘋果` 不同词。展示原文保留大小写。
词语和展示 ID 为 1～20 个 Unicode 码点，不能包含换行或控制字符；同房间 ID 忽略大小写后唯一。
作答隐藏至揭晓，成功提交后不可修改；非法输入保留重试机会且不会延长截止时间。

非全员同词时，每个至少两人的同词组内每人 +1 分；全员同词每人 +100 分，不再叠加 +1。
最后一轮同词仍然成功。轮数用尽仍未同词，或有效玩家不足两人时失败。
非终局揭晓持续 5 秒，再进入下一轮。下一局轮数、积分及词语历史重新初始化。
匿名 Cookie 在刷新后恢复原身份。单浏览器多个标签页共用身份，新标签页接管旧标签页。

房主可在准备阶段设置整数配置：容量 2～99、最多轮数 2～999、每轮 1～600 秒。
容量不能小于现有人数，保存配置清除全员准备。倒数期间不可加入、改名或改配置；对局中不可中途加入。
同房间可同时有多个同词组，各组独立计分。主动离开、放弃本局或到期未答只淘汰本人，不能在本局复活。
提交后、揭晓前弃权的答案仍会揭晓，但不参与本轮分组与加分；之前的积分保留。
揭晓后退出不重算积分。剩余至少两人且全部同词即可成功，结果同时列出初始、完成与弃权人数。
房主离开或断线时，按加入顺序转交给在线成员；无人在线则暂空缺，下一位重连者接任。

本局之前任意玩家已成功提交并揭晓的词都不可重用，包括后来弃权者的答案。
历史词同样去除首尾空白并忽略大小写；失败提示为“发送失败：该词已在之前轮次出现”，
保留草稿、未答状态和原截止时间，可以改词重试。同轮相同新词合法，新局清空禁词集合。
历史入口支持当前局与最近结束局，每次最多 20 轮，也可从指定轮次读取；当前未揭晓答案不可查询。
结果页显示结束原因、共同词、初始与有效人数、弃权、耗时、开始／结束时间、已开始轮数和并列积分。
人数不足时，未完成轮次也会展示已接受答案与未答情况，但不计本轮分数。
个人确认结果不改变房间状态：他人可以返回和修改配置，下一局仍需全员在线且重新准备。

## Appearance

页头“主题”按钮提供当前 daisyUI 版本的全部内置主题，手动选择保存在本浏览器，刷新后继续使用。
默认选择“跟随系统”：浅色偏好使用 light，深色偏好使用 dark；系统偏好变化时自动切换。
选择“跟随系统”会清除手动选择。主题只影响本人的页面，不改变房间或其他玩家的设置。

## Recovery and lifecycle

刷新或短暂断线不暂停计时，也不延长作答时间。已提交答案继续有效；未提交者仍须在原截止时间前恢复，
到期即弃权。已弃权玩家可以查看进度，但不能重新参赛。断线时禁止提交并保留当前页面的输入草稿。
同一会话的新标签页接管身份，旧标签页停止操作；提交有确认和最多三次同请求重试，恢复以服务端快照为准。

准备阶段断线身份保留 120 秒；终局后仍断线的成员从终局起重新保留 120 秒。
空房立即销毁并取消计时器；无房间关联且连续闲置 24 小时的匿名会话释放。
每个房间只保留当前局及最近结束局，之后更早的历史与提交确认释放。
重启服务会立即清空全部状态；旧 Cookie 会获得新会话，旧邀请链接显示房间不存在或已失效。

## Production

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

本地生产预览打开 <http://127.0.0.1:3000>。服务启动时自动读取可选的 `.env`。
实际部署将 `.env.example` 复制为 `.env`，把 `PUBLIC_ORIGIN` 设置为浏览器访问的完整 HTTPS 来源（不带结尾 `/`）。
`HOST` 默认为 `127.0.0.1`，`PORT` 默认为 `3000`；容器需要时设置 `HOST=0.0.0.0`。
生产会话 Cookie 启用 Secure、HttpOnly 和 SameSite=Strict，因此公开服务必须经过 HTTPS。
来源校验同时保护 HTTP 与 Socket.IO；展示 ID、客户端声明的 playerId 和 socket.id 都不作为凭据。
`GET /api/rooms/:code` 仅返回邀请是否有效，不返回成员或游戏信息。

只能部署一个服务进程，不运行 Node cluster 或多副本。进程管理器应保持单实例，并允许 WebSocket 和长轮询。
HTTPS 可由平台或 Nginx 终止。`sameword.example.com` 的 Nginx 配置见 [`deploy/nginx.conf`](deploy/nginx.conf)：
前端文件由 Nginx 直接提供，`/api/`、`/socket.io/` 和 `/health` 保留原路径转发到 `127.0.0.1:3000`。
该部署的 `.env` 设置为：

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=6999
PUBLIC_ORIGIN=https://sameword.example.com
```

- `root` 指向 `/path/to/same-word/dist/client`，与 Vite 构建输出一致，而不是 `dist`。
- 配置文件须由 Nginx 的 `http` 块加载，不能把包含 `map` 的整份配置放入 `server` 块。
- `/assets/` 中带哈希的构建资源缓存一年，缺失文件返回 404；页面使用 `no-cache`，邀请链接刷新时回退到 `index.html`。
- 代理关闭 Nginx 缓存并保留 API 返回的 `Cache-Control: no-store`；Socket.IO 同时支持 WebSocket 升级与长轮询，读取超时为 75 秒。

构建并启动单个 Node.js 服务后，在服务器检查配置并重载 Nginx：

```sh
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://sameword.example.com/health
```

`GET /health` 可用于健康检查。不要将 Cookie 或 Socket.IO 负载写入访问日志。
发布、回滚或重启都会清空正在进行的房间；旧链接会显示失效提示，并提供回首页、创建与加入入口。
浏览器不会用本地草稿、分数或成员列表重建对局。

## Focused verification

`pnpm test:rules` 验证词语、计分、历史词、截止边界、弃权、确认重放与过期计时器。
`pnpm test:network` 使用真实 Socket.IO 客户端验证配置边界、99 人容量、隐私、身份恢复、接管、历史权限和内存清理。
浏览器验收使用独立 Cookie 会话，检查两人完整流程、多人部分同词、历史词错误重试、弃权、刷新和新一局。
生产构建同时运行严格类型检查与浏览器导入边界检查。界面使用原生表单、可见状态文本和焦点反馈，庆祝页无持续动画。
