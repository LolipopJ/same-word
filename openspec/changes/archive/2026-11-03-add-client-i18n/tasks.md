# Tasks

## 1. 语言包与错误映射基础

- [x] 1.1 在 `src/client/i18n/messages.ts` 建立按页面域分组的中文字典，并以 `type Dictionary = typeof zh` 约束同结构英文字典；运行 `pnpm typecheck` 确认英文缺键、多键与参数签名不一致都会编译失败。
- [x] 1.2 在字典中加入覆盖 `src/shared/protocol.ts` 全部 `ErrorCode` 的 `Record<ErrorCode, string>` 映射与通用兜底文案，并加入客户端本地失败（连接中断、会话失败、确认超时、响应无效）条目；用定向测试断言每个错误码文案都存在且不同于兜底。
- [x] 1.3 添加语言格式化辅助（按 `zh-CN`／`en` 的 `Intl.DateTimeFormat` 与 `Intl.NumberFormat`），并加入 `src/client/i18n/messages.test.ts`，比较两种字典扁平化后的键路径集合一致、叶子非空且函数叶子可调用；运行 `pnpm exec tsx --test src/client/i18n/messages.test.ts` 验证通过。

## 2. 语言状态与页头切换

- [x] 2.1 在 `src/client/i18n/locale.tsx` 实现 `LocaleProvider` 与 `useLocale()`，初始语言读取 `localStorage` 的 `same-word-locale`，缺失时按 `navigator.languages` 首个 `zh` 语言决定，`localStorage` 异常时退化为检测结果；在 `main.tsx` 包裹 `App`，确认 Provider 位于 `App` 之外且不改变组件树结构。
- [x] 2.2 语言变化时同步 `document.documentElement.lang`（`zh-CN`／`en`）与 `document.title`；把 `index.html` 的中文初值与 `lang="zh-CN"` 作为脚本执行前的默认保留，浏览器切换语言后核对标题与 `lang` 均立即更新。
- [x] 2.3 在 `App.tsx` 页头主题按钮旁加入语言选择按钮（`btn` + `popover` + 单选组，选项为中文与 English），选择后写入 `localStorage` 并立即生效；刷新页面确认手动选择优先于浏览器语言，重新选择另一语言后仍按新值保留。
- [x] 2.4 核对语言切换不重建 `useRoom` 的 Socket 连接：在准备阶段与提交等待期间切换语言，确认房间快照、连接状态与输入草稿保持不变。

## 3. 入房与准备页面文案迁移

- [x] 3.1 将 `home-screen.tsx` 与 `invite-status.tsx` 的标题、说明、标签、占位符、按钮、规则与邀请状态文案改为 `useLocale()` 字典引用，邀请检查中的失败状态也走本地化条目；在中文与英文下分别验证有效邀请、失效邀请与普通首页三种入口仍符合现有表单结构。
- [x] 3.2 将 `lobby-screen.tsx` 与 `lobby-settings.tsx` 的房间码说明、邀请链接、准备进度、成员状态、房主标记、配置字段、保存按钮与配置权限说明改为字典引用；两种语言下核对房主与非房主视图、成员列表徽章与配置错误提示。
- [x] 3.3 用 grep 检查 `src/client` 中残留的用户可见中文字面量（排除字典文件、注释与测试数据），确认页面组件不再直接持有文案；`pnpm lint` 通过。

## 4. 对局、结果与历史文案迁移

- [x] 4.1 将 `game-screen.tsx` 的轮次标题、倒计时单位与无障碍名、揭晓提示、作答引导、词语提示、提交按钮、提交计数与玩家状态改为字典引用（计数文案用函数叶子处理英文单复数）；中英文下核对已提交锁定、弃权与提交中三种状态。
- [x] 4.2 将 `results.tsx` 的结束原因、弃权原因、成功与人数摘要、轮数与耗时、确认按钮、排名与并列标记改为字典引用，时间与小数改用语言格式化辅助；中英文下核对成功、轮数耗尽、人数不足与并列排名，确认耗时数值仍等于服务端 `durationMs` 对应的实际秒数。
- [x] 4.3 将 `round-answers.tsx`、`history.tsx` 与 `theme-switcher.tsx` 的未作答、有效与弃权标记、同词组说明、轮次状态、历史选项、读取按钮与空状态改为字典引用；主题名保持 daisyUI 标识符原文，仅“跟随系统”与无障碍名称本地化，中英文下各展开一次历史与主题弹层验证。
- [x] 4.4 将 `App.tsx` 的品牌名、连接状态徽章、断线提示、重连按钮、放弃与离开按钮改为字典引用；在中文与英文下分别制造断线与接管提示，确认状态文案与按钮名称完整可读。

## 5. 错误提示语言无关化

- [x] 5.1 在 `use-room.ts` 用携带客户端错误标识的错误类型替换现有中文字面量异常，保持重试次数、确认超时与连接检查行为不变；用定向测试或手动复现确认断线与确认超时仍抛出可识别的失败。
- [x] 5.2 在 `App.tsx` 与 `history.tsx` 改为按错误码或客户端错误标识取本地化文案，不再展示服务端 `message`；`room:configure` 的 `INVALID_INPUT` 使用含范围说明的配置条目，词语与展示 ID 的 `INVALID_INPUT` 在各自调用处使用对应条目。
- [x] 5.3 用英文界面分别触发 `ROOM_FULL`、`ROOM_NOT_FOUND`、`HISTORICAL_WORD` 与越界配置，确认显示英文提示且不含中文说明；构造未知错误码确认回退到英文通用失败提示。

## 6. 窄屏多语言验收与文档

- [x] 6.1 在 320px、360px 与桌面宽度分别以中文与英文走完创建／加入、准备、作答、揭晓、结果与历史，重点检查英文长按钮、长提示与错误文本无横向溢出、触控区仍不小于 44×44px；记录实际检查结果与未验证项。
- [x] 6.2 核对中英文切换不发送游戏命令、不改变房间快照、不清空草稿、不重播已结束的庆祝，也不清除已确认的结果状态；在成功彩带期间与提交等待期间各切换一次语言。
- [x] 6.3 在 README 的 Appearance 段落补充语言选择、默认检测、持久化与错误提示规则，并在 Focused verification 段补充键集合测试命令；核对文档描述与实现一致。
- [x] 6.4 运行 `pnpm typecheck`、`pnpm lint` 与 `pnpm exec tsx --test src/client/i18n/messages.test.ts`，确认行为保持且既有 `presentation.test.ts` 仍通过；只在改动涉及网络或服务端时再执行对应套件。