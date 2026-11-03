# Design

## Context

动机见 `proposal.md`；可验收行为见 `specs/client-localization/spec.md`。

已观察到的实现约束：

- 所有用户可见文案目前都是组件内的中文字面量，分布在 `App.tsx`、`home-screen.tsx`、`game-screen.tsx`、`lobby-screen.tsx`、`lobby-settings.tsx`、`results.tsx`、`history.tsx`、`round-answers.tsx`、`invite-status.tsx`、`theme-switcher.tsx` 与 `index.html`（`lang="zh-CN"` 与标题）。
- 服务端 `Ack.message` 为中文字符串，部分带拼接细节，例如 `展示 ID：${error.message}`、`发送失败：${error.message}`。客户端 `App.tsx` 直接 `setError(ack.message)` 展示，`history.tsx` 用 `data.message ?? "无法读取历史"` 兜底。
- `use-room.ts` 在本地抛出中文 `Error`（会话创建失败、连接中断、未收到确认），经 `App` 的 `catch` 直接展示。
- `ErrorCode` 是 `src/shared/protocol.ts` 中的联合类型，服务端拒绝时必定携带。命令请求本身不带语言，服务端状态与计时与语言无关。
- 浏览器零第三方国际化依赖；项目刻意保持依赖精简，已有测试使用 `tsx --test`，客户端无组件测试框架。
- `results.tsx` 已有 `reasons`／`forfeitReasons` 文案映射，`theme-switcher.tsx` 中的主题名是 daisyUI 标识符（专有名词）。
- 现有表现层（`presentation.ts`、`use-presentation.ts`）只比较快照与阶段，不包含文案，语言切换不进入其输入。

## Goals / Non-Goals

**Goals:**

- 用一套类型约束的单语言包驱动全部文案，让漏译在编译或定向测试中暴露，而不是等到界面出现键名。
- 让错误提示只依赖错误码，使界面语言与请求、日志、快照完全解耦。
- 语言切换只重渲染文案，不触碰房间、草稿、提交和一次性庆祝状态。

**Non-Goals:**

- 不引入 i18next、react-intl 等运行时库，也不做文案热更新、翻译平台接入或按房间统一语言。
- 不改动共享协议、服务端规则、日志语言、错误码集合或 `Ack.message` 的现有内容。
- 不提供 URL 语言前缀、语言自动跟随系统偏好变化或第三种语言。
- 不为语言切换新增浏览器端到端测试或快照测试框架。

## Decisions

### 1. 单语言包 + 上下文，不引入国际化库

在 `src/client/i18n/` 建立 `messages.ts`（`zh` 完整字典 + `en` 同结构字典）与 `locale.tsx`（上下文、选择与持久化）。字典按页面域分组（如 `document`、`common`、`home`、`lobby`、`game`、`results`、`history`、`errors`），叶子值为字符串或接收参数的函数。

`const zh = {...}` 后声明 `type Dictionary = typeof zh`，并写成 `const en: Dictionary = {...}`。这样英文缺键、多键、参数签名不一致都会在 `tsc -p tsconfig.client.json` 中报错，且无需运行期解析占位符。

理由：当前只需要两种语言与少量计数参数，`Record<ErrorCode, string>` 形式的穷尽检查已经覆盖最关键的风险；引入 i18next 或 `Intl.MessageFormat` 会带来插件、异步加载和占位符解析等本项目不需要的复杂度。备选方案是扁平 `"home.title"` 字符串键加 `{count}` 插值，它更贴近主流工具链，但丢掉参数类型安全，英文单复数也要额外的选择逻辑。

英文单复数与中文量词差异（例如 `1 person` / `2 people`）由函数叶子处理，不在字典外散落条件分支。

### 2. 语言状态放在 App 之上的 Provider

`main.tsx` 用 `LocaleProvider` 包裹 `App`，`useLocale()` 返回 `{ locale, setLocale, t, format }`。所有页面组件通过 `useLocale()` 取文案，不再接收语言 props，避免逐层透传。

`locale` 为 `"zh" | "en"`。`format` 提供 `dateTime(number)` 与 `decimal(number, digits)`，内部使用按语言固定的标签（`zh-CN`、`en`）与 `Intl.DateTimeFormat`／`Intl.NumberFormat`，避免每处组件自行拼装 `toLocaleString()`。

理由：语言是横切只读关注点，用上下文比逐层传参更小；Provider 位于 `App` 之外，使 `App` 内的房间、错误与表现逻辑与语言切换解耦，也保证切换时 `useRoom` 建立的 Socket 连接不重建（Provider 只改变 context 值，不改变组件树结构）。

### 3. 默认语言来自浏览器，手动选择持久化

初始值在首次渲染时同步计算：读取 `localStorage["same-word-locale"]`，命中 `zh`／`en` 则使用；否则取 `navigator.languages`（回退 `navigator.language`），首个元素以 `zh` 开头则用中文，其余用英文；`localStorage` 不可用或读取抛错时退化为检测结果。

选择器只提供“中文／English”两项并立即写入 `localStorage`。与主题不同，不提供“跟随系统”项：规格只要求默认检测与手动覆盖，缺少存储值即等于自动检测，因此不需要第三个哨兵值。备选方案是存 `"auto"` 并在选择器中增加第三项，但它要求额外的清除逻辑与说明文案，收益仅是让玩家重置选择，本变更不需要。

### 4. 错误只按错误码本地化

新增 `errorText(error: unknown)`：`CommandError`／`Ack` 形态的失败由 `code` 查 `Record<ErrorCode, string>` 取文案；客户端本地失败用 `LocaleError`（携带 `clientError` 标识，如 `connectionLost`、`submitUnconfirmed`、`sessionFailed`、`invalidResponse`）同类映射；无法识别时返回 `t.errors.unknown`。

`use-room.ts` 改为抛出 `LocaleError`，`App.tsx` 的 `catch` 与 `history.tsx` 的响应处理都走 `errorText`，不再展示服务端 `message`。`room:configure` 的 `INVALID_INPUT` 与词语、展示 ID 的 `INVALID_INPUT` 在原服务端是不同文案，客户端按业务动作在调用处选择条目（配置错误用含范围说明的 `invalidConfig`，词语用 `invalidWord` 等），不在表单层重建规则。

`use-room.ts` 不感知文案：`send` 在失败时抛出的 `LocaleError` 只携带客户端错误标识，`App` 的 `act` 包装据此选择条目。配置与词语的 `INVALID_INPUT` 由调用处传入的条目键覆盖，避免在 `use-room` 里猜测业务语义。

理由：错误码是既有稳定契约，服务端文案随时可改且面向日志；按码映射让提示可翻译、可穷尽检查，也避免在 `message` 中解析中文。备选方案是给命令增加 `locale` 字段由服务端返回本地化文案，这会把语言写入协议、引入服务端文案表并使日志与展示耦合，与本变更的非目标冲突。

### 5. 文档语言与页头文件名随语言更新

`LocaleProvider` 在语言变化时设置 `document.documentElement.lang`（`zh-CN`／`en`）与 `document.title`。`index.html` 保留中文初值与 `lang="zh-CN"`，作为脚本执行前的默认；两者随后由 Provider 覆盖。

页头现有 `ThemeSwitcher` 旁增加同形态的语言选择按钮（`btn` + `popover` + 单选组），无障碍名走字典。

### 6. 校验以编译期为主，加一个最小键集合测试

英文文档的类型标注让缺键在 `pnpm typecheck` 失败；另加 `src/client/i18n/messages.test.ts`，把两种字典扁平化为键路径集合后比较，并校验叶子非空、函数叶子可调用。测试同时遍历一份 `ErrorCode` 字面量清单，断言每个码的文案不等于通用兜底。

理由：类型检查能发现结构与参数差异，但顶层类型别名不会阻止嵌套对象上多余键的遗漏场景，键集合测试成本极低；穷尽映射虽然由 `Record` 保证，运行期断言能防止有人把映射改成 `Partial` 或 spread 合并时静默退化。

## Risks / Trade-offs

- [失去服务端文案中的具体原因] → 每个可操作错误在字典中写出与服务器一致的约束说明（如配置范围），并在调用处绑定正确的条目。
- [服务端与客户端文案出现不一致] → 客户端不再展示 `message`，两者只影响日志可读性，不会让玩家看到错误语言的内容。
- [英文文案在 320px 下变长] → 沿用现有 `wrap-anywhere`、`min-w-0`、`btn` 自动高度等工具类；实施时以窄屏实际渲染核对，不为英文单独缩小字号或触控区。
- [字典函数叶子让文案不可静态导出] → 现阶段只有两种语言且无翻译平台，牺牲可导出性换取参数类型安全是划算的；若未来接入翻译平台，可再改为占位符字符串。
- [首次渲染的标题与 `lang` 短暂为中文] → 仅在脚本加载前存在，`index.html` 已声明中文默认；Provider 挂载后立即同步，不接受为空白的 `<title>`。
- [语言切换导致整页重渲染] → Provider 只改变 context 值，`useRoom` 的 Socket 与本地状态不重建，切换不会重连或丢草稿；实施时验证提交等待期间切换语言后仍进入相同锁定状态。

## Migration Plan

一次性替换，不保留旧字面量分支：先建立字典与 Provider，再把组件逐页改为 `useLocale()`，最后更新 `index.html`、README 与定向测试。回滚即还原这些文件；没有存储迁移，旧的 `localStorage` 键留空即回到浏览器检测行为。