中文 | [English](./README.en.md)

# Same word · 同词

一个通过浏览器游玩的匿名多人联想游戏。无需注册，创建房间后把链接发给朋友即可开局；
服务端统一计时、隐藏作答并裁决计分。

- 前端：React + Vite + Tailwind CSS + daisyUI
- 后端：Fastify + Socket.IO，内存存储，单进程
- 共享：Zod 校验的命令与公开协议

## 游戏玩法

1. 设置展示 ID，一人创建房间，其他人用 6 位房间码或邀请链接加入。
2. 全员在线并准备后倒数 3 秒开局，默认 8 人、最多 20 轮、每轮 60 秒。
3. 第一轮各自随意写一个词；之后每轮参考上一轮的全部答案，写一个能与所有人“连起来”的词。
4. 全员写出同一个词即成功，每人 +100；否则每个至少两人的同词组各得 +1。
5. 词语忽略首尾空白与大小写，且同一局内不能重复使用之前轮次出现过的词。
6. 到期未答视为弃权，只淘汰本人，不影响其他玩家继续。

完整规则、配置范围与计分细节见 [`docs/game-rules.md`](docs/game-rules.md)。

## 部署

需要 Node.js 24 和 pnpm 12。

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

打开 <http://127.0.0.1:3000>，页面与 API 由同一个服务提供。

生产环境要点：

- 复制 `.env.example` 为 `.env`，把 `PUBLIC_ORIGIN` 设为浏览器访问的完整 HTTPS 来源（不带结尾 `/`）。
- 生产会话 Cookie 启用 Secure、HttpOnly 与 SameSite=Strict，公开服务必须经过 HTTPS。
- 只能运行一个进程，不启用 Node cluster 或多副本；状态全部在内存，重启会清空进行中的房间。
- Nginx 反向代理示例见 [`deploy/nginx.conf`](deploy/nginx.conf)，`/api/`、`/socket.io/` 与 `/health` 转发到 Node。

环境变量、Nginx 细节与上线检查见 [`docs/deployment.md`](docs/deployment.md)。

## 二次开发

```sh
pnpm install --frozen-lockfile
pnpm dev          # 服务端 watch + Vite，打开 http://127.0.0.1:5173
pnpm lint         # ESLint + Prettier + 导入排序
pnpm typecheck    # 导入边界 + 客户端/测试/服务端类型检查
pnpm test:rules   # 词语、计分、边界与计时器
pnpm test:network # Socket.IO 集成：容量、隐私、接管与历史权限
```

| 目录         | 职责                                           |
| ------------ | ---------------------------------------------- |
| `src/client` | 页面、实时反馈、主题与界面语言，仅依赖共享协议 |
| `src/server` | HTTP 与 Socket.IO 接入、权威游戏规则、内存会话 |
| `src/shared` | Zod 命令校验、公开协议与统一词语规则           |

新增或修改命令时，从 `src/shared/protocol.ts` 开始，再改 `src/server/app.ts` 的分发与
`src/server/rooms.ts` / `src/server/game.ts` 的规则，最后更新客户端与中英文语言包
`src/client/i18n/messages.ts`。

模块划分、协议、HTTP 接口与测试说明见 [`docs/architecture.md`](docs/architecture.md)
和 [`docs/development.md`](docs/development.md)。

## 更多文档

[`docs/`](docs/README.md) 收录游戏规则、架构、会话生命周期、界面细节、开发与部署说明。
需求与变更记录在 `openspec/` 中维护。
