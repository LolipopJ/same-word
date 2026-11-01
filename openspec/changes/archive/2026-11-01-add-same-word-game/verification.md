# Verification

## Environment

验收日期：2026-11-01。Node.js 24.22.1，pnpm 11.25.0，单进程内存服务。
浏览器使用 Chrome 与独立 Cookie 的应用内浏览器；多人流程增加一个独立 Socket.IO 会话。

## Automated Checks

| 命令 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | 安装成功，依赖版本和锁文件固定 |
| `pnpm typecheck` | 浏览器／共享导入边界检查及两份严格 TypeScript 配置通过 |
| `pnpm test:rules` | 13 个聚焦断言通过 |
| `pnpm test:network` | 6 个真实客户端检查通过 |
| `pnpm build` | 类型检查、Vite 浏览器构建及服务端编译通过 |
| `pnpm start` | 生产构建启动成功，页面、健康检查和实时连接可用 |
| 临时客户端导入探针 | 服务端类型导入被边界检查明确拒绝，探针随后删除 |
| `openspec validate add-same-word-game --strict --json` | 通过，无规格问题 |

规则检查覆盖词语修剪、大小写、Unicode 长度、控制字符、首次答案锁定、多个同词组、
首轮／最后一轮成功、轮数失败、精确截止、超时、弃权、历史词、重复确认及失效计时器。
词语、成功／失败、历史词与确认重放断言均先观察到预期失败，再实现对应行为。

网络检查覆盖配置上下界及非整数、展示身份、准备取消、倒数断线、房主转交、
99 人容量与第 100 人拒绝、中途加入拒绝、答案保密、刷新恢复、淘汰后拒绝参赛、
连接接管、重复提交、分页历史及非成员权限、同源限制、Cookie 属性与生命周期。
120 秒清理和 24 小时会话到期使用可控单调时间验证，不进行实际长时间等待。

## Browser Acceptance

- 两个独立浏览器会话完成创建、房间码／邀请加入、无效房间、准备和取消准备。
- 首轮提交 ` Apple ` 与 `apple`，成功后各得 100 分；空白词失败后仍可提交。
- 两人分别完成成功、超时失败、确认返回及新局轮数和积分清零。
- 三个真实会话完成部分同词：两人各加 1，另一人不加分；600 秒时限下全员提交后立即揭晓。
- 下一轮使用其他玩家的历史词 ` bridge `，本人收到规定错误；草稿保留、焦点移到错误，
  另一浏览器保持未答公开状态。改词后两人同词，第三人弃权，剩余两人成功并各为 101 分。
- 历史界面读取已揭晓轮次；结果显示共同词、原始／有效人数、弃权、时间、轮数和并列积分。
- 一人停留在结果时，另一人确认并修改房主配置；原结果保持不变。
- 同一会话新标签页接管成功，旧标签页显示被接管并禁用操作。
- 两个浏览器通过键盘触发创建、加入、配置、准备、提交和结果确认，完成两轮用尽失败。
- 窄屏约 375 CSS 像素检查首页、房间、作答、错误和结果，无横向溢出；同时检查桌面布局。
- 错误与结果分别获得焦点，表单具有标签，准备／提交／弃权／连接状态均有文字。
  庆祝页采用静态展示，计算样式中无动画；未更改用户系统的动态效果设置。
- 重启生产进程后，原会话自动得到新的服务端状态，旧链接明确显示失效，旧词语和积分不恢复；
  可立即创建新房间，配置回到 8 人／20 轮／60 秒。

## Capability Coverage

| 能力 | 验证依据 |
|---|---|
| `room-lobby` | 真实网络配置／容量／准备／权限检查，以及浏览器邀请与房主界面 |
| `round-gameplay` | 规则断言、精确截止和计时器检查，以及隐藏作答／揭晓／历史词浏览器流程 |
| `game-results` | 分组积分、失败优先级、结果快照断言，以及三人成功／两轮失败／独立确认 |
| `session-recovery` | 真实网络恢复、接管、重复确认、数据投影、历史权限与清理，以及生产重启 |

## Limits

本地生产验收通过回环 HTTP 访问；外部 HTTPS 证书和反向代理未部署验证。
README 提供 HTTPS、同源来源、Secure Cookie 和长连接代理配置。99 个连接验证功能容量，不代表负载基准。
全部已运行的最终检查通过，无未解决失败。应用状态按规格只保存在当前进程内存。

## Theme Update

页头新增主题按钮，提供 daisyUI 当前版本的全部 35 个内置主题及“跟随系统”。
默认由 CSS 根据系统偏好使用 light／dark；手动选择保存在本地，刷新后保留。
本次主题变更已通过 `pnpm typecheck` 和 `pnpm exec vite build`；未新增测试或运行浏览器交互测试，
主题选择、刷新保留与系统偏好变化的交互尚未实测。上面的游戏验收记录保留原验收范围。

## P2 Fixes

- 准备阶段未准备成员主动离开或过期移除后，重检剩余成员的开局条件；倒数中的离开仍取消倒数。
- 历史查询取消上一请求，旧请求不能更新结果、错误或加载状态，组件卸载时同样取消请求。
- `src/server/game.test.ts` 新增离开／过期移除触发开局，以及倒数中离开保持取消的回归用例。
- 本次仅修改两个业务文件，按仓库验证约定未运行测试；`pnpm typecheck` 通过。
  新增回归用例和历史并发查询的浏览器交互尚未实测，未重建或重启本地生产预览。

## ESLint Fixes

- Initialize the countdown clock and dismissed-result session storage lazily.
- Clear action errors when the game, round, or result changes using a conditional state update during render.
- Use the group word as the stable answer-group key and name refs with the `Ref` suffix.
- `pnpm lint` passes with zero errors and warnings; `pnpm typecheck` passes.
- No application tests, browser interactions, or production builds were run for this lint fix.
