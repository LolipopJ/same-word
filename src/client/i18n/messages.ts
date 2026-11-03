import type { ErrorCode } from "../../shared/protocol.js";

export const locales = ["zh", "en"] as const;
export type Locale = (typeof locales)[number];
export const localeTags: Record<Locale, string> = { zh: "zh-CN", en: "en" };

export type ClientErrorKey = "connectionLost" | "submitUnconfirmed";

const zh = {
  document: {
    title: "同词相遇 · 多人联机文字联想游戏",
    description:
      "同词相遇是一款多人联机文字联想游戏。创建房间，邀请朋友各写一个词，从彼此的答案寻找连接，直到所有人写出同一个词。",
    imageAlt: "同词相遇：和朋友从不同的词出发，在同一个词相遇。",
  },
  language: {
    label: "界面语言",
    zh: "中文",
    en: "English",
  },
  theme: {
    label: "页面主题",
    system: "跟随系统",
  },
  app: {
    brand: "同词相遇",
    statusOnline: "已连接",
    statusReplaced: "已被另一标签页接管",
    statusReconnecting: "正在恢复连接",
    replacedNotice: "此身份正在另一标签页使用。刷新可重新接管。",
    reconnectingNotice: "正在恢复连接，倒计时继续。请保留页面。",
    reconnect: "重新连接",
    forfeit: "放弃本局，留在房间",
    leave: "离开房间",
    leaveTitle: "离开当前房间？",
    leaveDescription: "确定要离开当前房间并返回首页吗？",
    stay: "留在房间",
  },
  home: {
    heroLineOne: "不同的起点，",
    heroLineTwo: "同一个词。",
    heroDescription:
      "同词相遇是一款多人联机文字联想游戏。各写一个词，从彼此的答案里寻找连接，直到所有人写出同一个词。",
    inviteDescription:
      "无需注册。输入展示 ID 创建房间，把邀请链接或 6 位房间码发给朋友；全员在线并准备后，一起开始。",
    exampleTitle: "比如这样相遇",
    exampleBody:
      "第一轮，一人写「太阳」，另一人写「雨水」；下一轮，两人想到它们的连接，都写下「彩虹」，就成功同词了。",
    requiresJavaScript: "开启 JavaScript 后即可创建房间，邀请朋友一起玩。",
    joinInviteTitle: "加入朋友的房间",
    createTitle: "开始一场默契实验",
    displayName: "展示 ID",
    displayNamePlaceholder: "你希望朋友怎么称呼你",
    nameHint: "1～20 个字符，同房间内不能重名。",
    createRoom: "创建房间",
    roomCodeLabel: "已有邀请？输入房间码",
    roomCodePlaceholder: "6 位房间码",
    joinRoom: "加入房间",
    rulesSummary: "怎么玩？",
    closeRules: "知道了",
    repository: "GitHub 仓库",
    rulesBody:
      "每轮各写一个词，揭晓后连接上一轮的所有答案。部分同词每人 +1，全员同词每人 +100。已揭晓的词不能再用；全员准备后一起开始。",
  },
  invite: {
    checking: "正在检查邀请…",
    ready: "邀请已就绪，输入展示 ID 后加入房间。",
    invalid: "房间不存在或已失效。请重新创建房间，或使用新的邀请。",
    unavailable: "暂时无法检查邀请，请重新连接后重试。",
    backHome: "回到首页",
  },
  lobby: {
    inviteHint: "邀请朋友，一起准备",
    inviteLink: "邀请链接",
    allReady: "全员准备，一起出发！",
    readyProgress: (ready: number, total: number) =>
      `已准备 ${ready} / ${total} 人`,
    readyProgressLabel: "准备进度",
    cancelReady: "取消准备",
    ready: "准备",
    startConditions: (rounds: number, seconds: number) =>
      `全员在线并准备后开始 · 最多 ${rounds} 轮 · 每轮 ${seconds} 秒`,
    membersSummary: (count: number, capacity: number) =>
      `朋友们 · ${count}/${capacity} · 查看全部`,
    host: "房主",
    you: "你",
    memberReady: "已准备",
    memberNotReady: "未准备",
    memberOffline: "断线",
    settingsSummary: "展示 ID 与房间设置",
  },
  settings: {
    renameLabel: "修改展示 ID",
    renameSave: "保存展示 ID",
    hostConfig: "房主配置 · 保存后全员重新准备",
    capacity: "容量",
    maxRounds: "最多轮数",
    roundSeconds: "每轮秒数",
    save: "保存配置",
    notHost: "配置由房主调整。房主离线或离开后，转交给最早加入的在线成员。",
  },
  game: {
    remainingLabel: "剩余秒数",
    remainingSuffix: "秒",
    roundTitle: (round: number, max: number) => `第 ${round} / ${max} 轮`,
    revealing: "一起揭晓，5 秒后进入下一轮。",
    firstPrompt: "随意想一个词，作为起点",
    linkPrompt: "连接上一轮的所有词，你会想到什么？",
    submitted: (word: string) =>
      `你已提交「${word}」。等待朋友们，答案已锁定。`,
    fixAndResubmit: "修改词语后重新提交",
    inputHint: "1～20 个字符 · 本局已揭晓的词不能再用 · 提交后无法修改",
    submitting: "正在提交…",
    submit: "提交词语",
    forfeited: "你已弃权，可以继续查看本局进度。",
    submittedCount: (submitted: number, total: number) =>
      `已提交 ${submitted} / ${total} 人`,
    playersSummary: (count: number) => `玩家状态与积分 · 查看全部 ${count} 人`,
    playerLine: (name: string, score: number) => `${name} · ${score} 分`,
    playerForfeited: "已弃权",
    playerSubmitted: "已提交",
    playerThinking: "思考中",
  },
  answers: {
    unanswered: "未作答",
    valid: "有效",
    forfeited: "已弃权",
    points: (points: number) => `+${points} 分`,
    groupTag: (index: number) => `同词组 ${index}`,
    groupsLabel: "有效同词组",
    groupSummary: (index: number, count: number, points: number) =>
      `同词组 ${index} · ${count} 人 · 每人 +${points}`,
    roundCompleted: (round: number) => `第 ${round} 轮 · 已揭晓`,
    roundIncomplete: (round: number) => `第 ${round} 轮 · 已开始，未完成`,
    expandAll: (count: number) => `查看全部 ${count} 条线索与同词组`,
  },
  results: {
    successBadge: "成功",
    endedBadge: "本局结束",
    reasonSuccess: "默契相遇！",
    reasonRoundLimit: "轮数已用完",
    reasonInsufficient: "有效玩家不足 2 人",
    groupLine: (count: number, points: number) =>
      `${count} 人同词 · 每人 +${points} 分`,
    summary: (initial: number, final: number, forfeited: number) =>
      `${initial} 人开始 · ${final} 人完成 · ${forfeited} 人弃权`,
    rounds: (rounds: number, seconds: string) =>
      `已开始 ${rounds} 轮 · 耗时 ${seconds} 秒`,
    confirm: "确认，回到准备",
    confirmHint: "每个人独立确认。下一局仍需全员重新准备。",
    detailsSummary: "查看完整排名、时间与弃权明细",
    startedAt: "开始：",
    endedAt: "结束：",
    rank: (rank: number) => `第 ${rank} 名`,
    tied: "（并列）",
    score: (score: number) => `${score} 分`,
    forfeitLine: (round: number, reason: string) =>
      `第 ${round} 轮 · ${reason}`,
    forfeitLeft: "离开房间",
    forfeitVoluntary: "主动弃权",
    forfeitTimeout: "超时未答",
  },
  history: {
    open: "查看轮次历史",
    close: "收起历史",
    selectGame: "选择对局",
    currentGame: "当前对局",
    lastGame: "最近结束的一局",
    fromRound: "从指定轮次查看",
    loadRound: "读取轮次",
    loading: "正在读取历史…",
    empty: "还没有已揭晓轮次。",
    next: "接下来 20 轮",
    note: "每次最多读取 20 轮，仅显示已揭晓答案。",
    failed: "无法读取历史",
  },
  errors: {
    code: {
      INVALID_INPUT: "输入格式无效，请检查后重试",
      CONFIG_BELOW_MEMBERS: "容量不能低于当前成员人数",
      SESSION_REQUIRED: "会话已失效，请刷新页面后重试",
      TAKEN_OVER: "当前连接已失效，请刷新页面",
      ROOM_NOT_FOUND: "房间不存在或已失效，请重新创建或加入",
      ROOM_FULL: "房间已满",
      ALREADY_IN_ROOM: "请先离开当前房间",
      NOT_MEMBER: "请先加入房间",
      NOT_HOST: "仅房主可以修改配置",
      WRONG_PHASE: "当前阶段不允许此操作，请稍后重试",
      NAME_TAKEN: "该展示 ID 已被使用",
      STALE_REQUEST: "请求已过期，请按当前轮次重试",
      FORFEITED: "你已弃权，不能在本局恢复参赛",
      ALREADY_SUBMITTED: "本轮已提交，无法更改",
      HISTORICAL_WORD: "发送失败：该词已在之前轮次出现",
    } satisfies Record<ErrorCode, string>,
    invalidConfig:
      "配置无效：容量 2～99、最多轮数 2～999、每轮时限 1～600 秒，均须为整数",
    invalidWord: "发送失败：请输入 1～20 个字符，且不能包含换行或控制字符",
    invalidName: "展示 ID 需为 1～20 个字符，且不能包含换行或控制字符",
    invalidJoin: "展示 ID 需为 1～20 个字符，房间码需为 6 位字母或数字",
    client: {
      connectionLost: "连接已中断，请等待恢复后操作",
      submitUnconfirmed: "未收到确认，请检查连接；已接受的答案会在恢复后显示",
    } satisfies Record<ClientErrorKey, string>,
    unknown: "发生未知错误，请重试",
  },
};

export type Dictionary = typeof zh;

const en: Dictionary = {
  document: {
    title: "Same Word · Multiplayer Word Association Game",
    description:
      "Same Word is a multiplayer word association game. Create a room, invite friends, and connect each other's answers until everyone writes the same word.",
    imageAlt: "Same Word: start with different words and meet at the same one.",
  },
  language: {
    label: "Interface language",
    zh: "中文",
    en: "English",
  },
  theme: {
    label: "Page theme",
    system: "Follow system",
  },
  app: {
    brand: "Same Word",
    statusOnline: "Connected",
    statusReplaced: "Taken over by another tab",
    statusReconnecting: "Reconnecting",
    replacedNotice:
      "This identity is in use in another tab. Refresh to take it back.",
    reconnectingNotice:
      "Reconnecting. The countdown keeps running, so keep this page open.",
    reconnect: "Reconnect",
    forfeit: "Forfeit this game, stay in the room",
    leave: "Leave room",
    leaveTitle: "Leave this room?",
    leaveDescription:
      "Are you sure you want to leave this room and return home?",
    stay: "Stay in room",
  },
  home: {
    heroLineOne: "Different starts,",
    heroLineTwo: "the same word.",
    heroDescription:
      "Same Word is a multiplayer word association game. Each write a word, then connect each other's answers until everyone writes the same word.",
    inviteDescription:
      "No account needed. Pick a display ID, create a room, and send friends the invite link or 6-character code. Once everyone is online and ready, play together.",
    exampleTitle: "One way to meet",
    exampleBody:
      "In round one, one player writes “sun” and another writes “rain”. Next round, both connect those clues and write “rainbow” — a successful match!",
    requiresJavaScript:
      "Enable JavaScript to create a room and play with friends.",
    joinInviteTitle: "Join a friend's room",
    createTitle: "Start an intuitive experiment",
    displayName: "Display ID",
    displayNamePlaceholder: "What should your friends call you?",
    nameHint: "1–20 characters, unique within the room.",
    createRoom: "Create room",
    roomCodeLabel: "Have an invite? Enter a room code",
    roomCodePlaceholder: "6-character room code",
    joinRoom: "Join room",
    rulesSummary: "How to play?",
    closeRules: "Got it",
    repository: "GitHub repository",
    rulesBody:
      "Each round everyone writes one word, then links every answer from the previous round. Some players matching earns each of them +1; everyone matching earns each +100. Revealed words can't be reused, and the game starts once everyone is ready.",
  },
  invite: {
    checking: "Checking invite…",
    ready: "The invite is ready. Enter a display ID to join.",
    invalid:
      "This room doesn't exist or has expired. Create a room or use a new invite.",
    unavailable:
      "We can't check the invite right now. Reconnect and try again.",
    backHome: "Back to home",
  },
  lobby: {
    inviteHint: "Invite friends, then get ready together",
    inviteLink: "Invite link",
    allReady: "Everyone's ready — here we go!",
    readyProgress: (ready: number, total: number) =>
      `${ready} / ${total} players ready`,
    readyProgressLabel: "Ready progress",
    cancelReady: "Cancel ready",
    ready: "Ready",
    startConditions: (rounds: number, seconds: number) =>
      `Starts when everyone is online and ready · up to ${rounds} rounds · ${seconds}s per round`,
    membersSummary: (count: number, capacity: number) =>
      `Players · ${count}/${capacity} · Show all`,
    host: "Host",
    you: "you",
    memberReady: "Ready",
    memberNotReady: "Not ready",
    memberOffline: "Offline",
    settingsSummary: "Display ID and room settings",
  },
  settings: {
    renameLabel: "Edit display ID",
    renameSave: "Save display ID",
    hostConfig: "Host settings · saving resets everyone to not ready",
    capacity: "Capacity",
    maxRounds: "Max rounds",
    roundSeconds: "Seconds per round",
    save: "Save settings",
    notHost:
      "The host manages settings. If the host goes offline or leaves, settings pass to the earliest online member.",
  },
  game: {
    remainingLabel: "Seconds remaining",
    remainingSuffix: "s",
    roundTitle: (round: number, max: number) => `Round ${round} / ${max}`,
    revealing: "Revealing together. The next round starts in 5 seconds.",
    firstPrompt: "Write any word to start",
    linkPrompt: "Link every word from the last round — what comes to mind?",
    submitted: (word: string) =>
      `You submitted "${word}". Waiting for your friends; your answer is locked.`,
    fixAndResubmit: "Change the word and submit again",
    inputHint:
      "1–20 characters · words revealed this game can't be reused · you can't edit after submitting",
    submitting: "Submitting…",
    submit: "Submit word",
    forfeited: "You forfeited this game. You can still follow its progress.",
    submittedCount: (submitted: number, total: number) =>
      `${submitted} / ${total} submitted`,
    playersSummary: (count: number) =>
      `${count === 1 ? "1 player" : `${count} players`} · scores and status · Show all ${count}`,
    playerLine: (name: string, score: number) => `${name} · ${score} pts`,
    playerForfeited: "Forfeited",
    playerSubmitted: "Submitted",
    playerThinking: "Thinking",
  },
  answers: {
    unanswered: "No answer",
    valid: "valid",
    forfeited: "forfeited",
    points: (points: number) => `+${points} pts`,
    groupTag: (index: number) => `Group ${index}`,
    groupsLabel: "Matching groups",
    groupSummary: (index: number, count: number, points: number) =>
      `Group ${index} · ${count} ${count === 1 ? "player" : "players"} · +${points} each`,
    roundCompleted: (round: number) => `Round ${round} · revealed`,
    roundIncomplete: (round: number) => `Round ${round} · started, unfinished`,
    expandAll: (count: number) =>
      `Show all ${count} ${count === 1 ? "clue" : "clues"} and matching groups`,
  },
  results: {
    successBadge: "Success",
    endedBadge: "Game over",
    reasonSuccess: "Minds met!",
    reasonRoundLimit: "Out of rounds",
    reasonInsufficient: "Fewer than 2 active players",
    groupLine: (count: number, points: number) =>
      `${count} matched · +${points} each`,
    summary: (initial: number, final: number, forfeited: number) =>
      `${initial} started · ${final} finished · ${forfeited} forfeited`,
    rounds: (rounds: number, seconds: string) =>
      `${rounds} ${rounds === 1 ? "round" : "rounds"} started · ${seconds}s elapsed`,
    confirm: "Confirm and return to ready",
    confirmHint:
      "Everyone confirms separately. The next game needs everyone ready again.",
    detailsSummary: "Show full ranking, times and forfeits",
    startedAt: "Started: ",
    endedAt: "Ended: ",
    rank: (rank: number) => `#${rank}`,
    tied: " (tied)",
    score: (score: number) => `${score} pts`,
    forfeitLine: (round: number, reason: string) =>
      `Round ${round} · ${reason}`,
    forfeitLeft: "Left the room",
    forfeitVoluntary: "Forfeited",
    forfeitTimeout: "Timed out",
  },
  history: {
    open: "View round history",
    close: "Hide history",
    selectGame: "Select game",
    currentGame: "Current game",
    lastGame: "Most recently finished game",
    fromRound: "View from a specific round",
    loadRound: "Load rounds",
    loading: "Loading history…",
    empty: "No revealed rounds yet.",
    next: "Next 20 rounds",
    note: "Loads up to 20 rounds at a time, revealed answers only.",
    failed: "Couldn't load history",
  },
  errors: {
    code: {
      INVALID_INPUT: "That input isn't valid. Check it and try again.",
      CONFIG_BELOW_MEMBERS:
        "Capacity can't be lower than the number of players in the room",
      SESSION_REQUIRED: "Your session expired. Refresh the page and try again.",
      TAKEN_OVER: "This connection is no longer active. Refresh the page.",
      ROOM_NOT_FOUND:
        "That room doesn't exist or has expired. Create or join another one.",
      ROOM_FULL: "The room is full",
      ALREADY_IN_ROOM: "Leave your current room first",
      NOT_MEMBER: "Join a room first",
      NOT_HOST: "Only the host can change settings",
      WRONG_PHASE: "That isn't allowed right now. Try again later.",
      NAME_TAKEN: "That display ID is already taken",
      STALE_REQUEST: "That request expired. Retry for the current round.",
      FORFEITED: "You forfeited and can't rejoin this game",
      ALREADY_SUBMITTED: "You already submitted this round and can't change it",
      HISTORICAL_WORD: "Failed to send: that word appeared in an earlier round",
    },
    invalidConfig:
      "Invalid settings: capacity 2–99, max rounds 2–999, and 1–600 seconds per round, all as integers",
    invalidWord:
      "Failed to send: use 1–20 characters without line breaks or control characters",
    invalidName:
      "Display ID must be 1–20 characters without line breaks or control characters",
    invalidJoin:
      "Display ID must be 1–20 characters and the room code 6 letters or digits",
    client: {
      connectionLost:
        "The connection dropped. Wait for it to recover, then try again.",
      submitUnconfirmed:
        "No confirmation received. Check your connection; accepted answers appear once you reconnect.",
    },
    unknown: "Something went wrong. Please try again.",
  },
};

export const messages: Record<Locale, Dictionary> = { zh, en };
