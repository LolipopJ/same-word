# 架构

三个源码目录划分职责，只运行一个 Node.js 服务进程：

| 目录 | 职责 | 技术栈 |
| --- | --- | --- |
| `src/client` | 页面、实时反馈、主题与界面语言 | React、Vite、Tailwind CSS、daisyUI |
| `src/server` | HTTP 与 Socket.IO 接入、权威游戏规则、内存会话 | Fastify、Socket.IO |
| `src/shared` | Zod 命令校验、公开协议与统一词语规则 | Zod |

所有状态保存在内存，重启会清空房间、会话、积分和历史。
`src/client` 仅依赖共享协议，不允许导入服务端状态。

## 服务端模块

| 文件 | 职责 |
| --- | --- |
| `src/server/app.ts` | Fastify 与 Socket.IO 装配、来源校验、HTTP 接口、会话 Cookie |
| `src/server/rooms.ts` | 房间生命周期、成员与房主、配置、准备与倒数、计时器 |
| `src/server/game.ts` | 轮次、作答、分组计分、弃权与结果 |
| `src/server/sessions.ts` | 匿名会话、恢复与空闲清理 |
| `src/server/errors.ts` | 错误码与确认回包 |
| `src/server/log.ts` | 统一格式的服务端日志 |

## 协议

`src/shared/protocol.ts` 是客户端与服务端唯一的契约，包含：

- 命令与其参数的 Zod 校验（`room:create`、`room:join`、`room:leave`、`room:configure`、
  `player:rename`、`player:ready`、`game:submit`、`game:forfeit`、`state:sync`）；
- 错误码 `INVALID_INPUT`、`CONFIG_BELOW_MEMBERS`、`SESSION_REQUIRED`、`TAKEN_OVER`、
  `ROOM_NOT_FOUND`、`ROOM_FULL`、`ALREADY_IN_ROOM`、`NOT_MEMBER`、`NOT_HOST`、`WRONG_PHASE`、
  `NAME_TAKEN`、`STALE_REQUEST`、`FORFEITED`、`ALREADY_SUBMITTED`、`HISTORICAL_WORD`；
- 视图类型 `Snapshot`、`RoomView`、`GameView`、`RoundView`、`Result`、`HistoryPage`。

服务端每次变更后递增房间 `version`，并向房间内所有在线成员推送 `state:sync` 快照；
客户端丢弃版本落后的快照。

## HTTP 接口

| 接口 | 说明 |
| --- | --- |
| `POST /api/session` | 建立或恢复匿名会话，写入会话 Cookie |
| `GET /api/rooms/:code` | 邀请有效性检查，仅返回房间是否存在 |
| `GET /api/rooms/:code/games/:gameId/rounds?after=` | 分页读取当前局或最近结束局的历史，每页最多 20 轮 |
| `GET /health` | 健康检查 |

## 边界与计时器

`scripts/check-boundaries.mjs` 借助 TypeScript 的模块解析检查 `src/client` 与 `src/shared`
是否导入了 `src/server`，在 `pnpm typecheck` 中随构建一起执行。

房间计时器按最近截止时间设置：倒数开始、本轮截止、离线保留到期各自触发一次 `advance`，
版本未变化时继续滚动到下一个截止时间。计时器 `unref`，不阻止进程退出。