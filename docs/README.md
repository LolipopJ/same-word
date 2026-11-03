# 文档索引

Same word（同词）是一套匿名多人联想游戏，附加资料按主题拆分：

| 文档 | 内容 |
| --- | --- |
| [`game-rules.md`](./game-rules.md) | 开局、配置、每轮玩法、计分、弃权、结果与历史 |
| [`architecture.md`](./architecture.md) | 目录职责、协议、HTTP 接口与计时器 |
| [`lifecycle.md`](./lifecycle.md) | 断线恢复、身份接管、过期清理与日志 |
| [`interface.md`](./interface.md) | 响应式、触控、实时反馈、动效、主题与界面语言 |
| [`development.md`](./development.md) | 环境、命令、类型检查、代码风格、测试与 OpenSpec |
| [`deployment.md`](./deployment.md) | 生产构建、环境变量、Nginx 与上线检查 |

游戏规则本身以服务端为准，实现见 `src/server/game.ts`、`src/server/rooms.ts`
与共享契约 `src/shared/protocol.ts`。