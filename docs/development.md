# 开发指南

## 环境

需要 Node.js 24 和 pnpm 12。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://127.0.0.1:5173>。Vite 将 `/api`、`/health` 和 `/socket.io` 代理到同源的 Fastify 服务（3000 端口）。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 并行启动服务端 watch 与 Vite |
| `pnpm lint` | ESLint + Prettier + 导入排序检查，零警告 |
| `pnpm lint:fix` | 应用可自动修复的问题 |
| `pnpm typecheck` | 导入边界检查 + 客户端、测试、服务端三套类型检查 |
| `pnpm test:rules` | 词语、计分、历史词、截止边界、弃权、确认重放与过期计时器 |
| `pnpm test:network` | 真实 Socket.IO 客户端：配置边界、99 人容量、隐私、身份恢复、接管、历史权限与内存清理 |
| `pnpm build` | 类型检查 + Vite 构建 + 服务端编译 |
| `pnpm start` | 运行 `dist/server/index.js`，自动读取可选的 `.env` |

## 类型检查与边界

`pnpm typecheck` 依次执行：

1. `scripts/check-boundaries.mjs` —— 确认 `src/client` 与 `src/shared` 未导入 `src/server`；
2. `tsconfig.client.json` —— 浏览器与共享模块；
3. `tsconfig.test.json` —— 连同 `src/client` 与 `src/shared` 下的 `*.test.ts` 一起检查，避免测试类型错误逃过构建；
4. `tsconfig.server.json` —— 服务端编译。

## 代码风格

`pnpm lint` 覆盖 JavaScript 与 TypeScript 源码、测试、脚本和配置，启用推荐 ESLint 与 TypeScript 规则、
React Hooks 规则、Prettier 格式化和 `simple-import-sort` 导入／导出排序。
`pnpm lint:fix` 应用可用自动修复。格式化由 `eslint-plugin-prettier/recommended` 执行，
其推荐集成会关闭冲突的 ESLint 格式规则。构建产物与本地工具目录不参与 lint。

## 测试

```sh
pnpm test:rules
pnpm test:network
pnpm exec tsx --test src/client/presentation.test.ts
pnpm exec tsx --test src/client/i18n/messages.test.ts
```

- `pnpm test:rules`：词语、计分、历史词、截止边界、弃权、确认重放与过期计时器。
- `pnpm test:network`：配置边界、99 人容量、隐私、身份恢复、接管、历史权限和内存清理。
- `presentation.test.ts`：实时反馈、恢复基线、重复快照、终局与取消边界。
- `messages.test.ts`：中英语言包键集合一致、叶子非空，每个错误码都有区别于通用兜底的文案，
  且每种错误描述都解析到自己的条目而非兜底。

浏览器验收使用独立 Cookie 会话，检查两人完整流程、多人部分同词、历史词错误重试、弃权、刷新和新一局。
生产构建同时运行严格类型检查与浏览器导入边界检查。界面使用原生表单、可见状态文本和焦点反馈，
庆祝无持续循环动画。

## OpenSpec

需求与变更记录在 `openspec/`：`openspec/specs/` 保存当前能力规范，
`openspec/changes/` 保存进行中的变更，完成后归档到 `openspec/changes/archive/`。
制品统一使用中文，结构性标题与 SHALL／MUST 关键字保留英文。