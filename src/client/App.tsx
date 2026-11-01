import { useEffect, useRef, useState } from "react";

import type { Ack, Command, Payload } from "../shared/protocol.js";
import { GameScreen, Remaining, Results } from "./game-screen.js";
import { History } from "./history.js";
import { InviteStatus } from "./invite-status.js";
import { LobbySettings } from "./lobby-settings.js";
import { ThemeSwitcher } from "./theme-switcher.js";
import { useRoom } from "./use-room.js";

export type Action = <K extends Command>(
  event: K,
  payload: Payload<K>,
) => Promise<boolean>;
export default function App() {
  const { snapshot, status, send, offset } = useRoom();
  const [name, setName] = useState("");
  const inviteCode = location.pathname.startsWith("/rooms/")
    ? (location.pathname.split("/")[2] ?? "").toUpperCase()
    : null;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("dismissed-result"),
  );
  const room = snapshot?.room;
  const online = status === "online";
  const result = room?.result;
  const errorContext = `${room?.game?.id}:${room?.game?.round}:${result?.gameId}`;
  const [previousErrorContext, setPreviousErrorContext] =
    useState(errorContext);
  if (previousErrorContext !== errorContext) {
    setPreviousErrorContext(errorContext);
    setError("");
  }
  const showResult =
    result &&
    !room?.game &&
    result.gameId !== dismissed &&
    result.players.some((player) => player.id === snapshot?.playerId);
  useEffect(() => {
    if (room?.code) history.replaceState(null, "", `/rooms/${room.code}`);
  }, [room?.code]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function act(operation: () => Promise<Ack>) {
    setBusy(true);
    setError("");
    try {
      const ack = await operation();
      if (!ack.ok) setError(ack.message);
    } catch (error) {
      setError(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }
  const action: Action = async (event, payload) => {
    let success = false;
    await act(async () => {
      const ack = await send(event, payload);
      success = ack.ok;
      return ack;
    });
    return success;
  };
  return (
    <main
      className="
        mx-auto max-w-4xl px-5 py-8
        sm:p-12
      "
    >
      {/* eslint-disable-next-line better-tailwindcss/enforce-consistent-line-wrapping */}
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <a href="/" className="text-2xl font-black tracking-tight">
          同词 <span className="text-sm font-medium">Same word</span>
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge badge-outline">
            {online
              ? "已连接"
              : status === "replaced"
                ? "已被另一标签页接管"
                : "正在恢复连接"}
          </span>
          <ThemeSwitcher />
        </div>
      </header>
      {!online && (
        <p className="mb-5 alert" role="status">
          {status === "replaced"
            ? "此身份正在另一标签页使用。刷新可重新接管。"
            : "正在恢复连接，倒计时继续。请保留页面。"}
          <button className="btn" onClick={() => location.reload()}>
            重新连接
          </button>
        </p>
      )}
      {error && (
        <p
          ref={errorRef}
          tabIndex={-1}
          id="form-error"
          role="alert"
          className="mb-5 alert alert-error"
        >
          {error}
        </p>
      )}
      {!room && online && inviteCode !== null && (
        <InviteStatus key={snapshot?.playerId} code={inviteCode} />
      )}
      {!room ? (
        <div
          className="
            grid gap-8
            md:grid-cols-2 md:items-center
          "
        >
          <section>
            <p className="mb-4 text-sm font-semibold tracking-widest">
              一起想，想一起。
            </p>
            <h1
              className="
                text-5xl/tight font-black
                sm:text-6xl
              "
            >
              不同的起点，
              <br />
              同一个词。
            </h1>
            <p className="mt-6 text-lg/relaxed">
              和朋友各写一个词，再从彼此的答案里寻找连接。你们的想法，会在第几轮相遇？
            </p>
          </section>
          <section className="card bg-base-100 shadow-sm card-border">
            <div className="card-body gap-5">
              <h2 className="card-title">
                {inviteCode !== null ? "加入朋友的房间" : "开始一场默契实验"}
              </h2>
              <label className="fieldset">
                展示 ID
                <input
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="nickname"
                  placeholder="你希望朋友怎么称呼你"
                  aria-describedby="name-hint form-error"
                />
              </label>
              <p id="name-hint" className="text-sm">
                1～20 个字符，同房间内不能重名。
              </p>
              {inviteCode === null && (
                <button
                  className="btn btn-primary"
                  disabled={!online || busy}
                  onClick={() => void act(() => send("room:create", { name }))}
                >
                  创建房间
                </button>
              )}
              <form
                className="fieldset gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(() =>
                    send("room:join", { name, code: inviteCode ?? code }),
                  );
                }}
              >
                {inviteCode === null && (
                  <>
                    <label htmlFor="room-code">已有邀请？输入房间码</label>
                    <input
                      id="room-code"
                      className="input w-full tracking-widest uppercase"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      autoComplete="off"
                      placeholder="6 位房间码"
                    />
                  </>
                )}
                <button
                  className={inviteCode !== null ? "btn btn-primary" : "btn"}
                  disabled={!online || busy}
                >
                  加入房间
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : (
        <>
          {room.game ? (
            <GameScreen
              key={`${room.game.id}-${room.game.round}`}
              game={room.game}
              action={action}
              disabled={!online || busy}
              offset={offset}
              error={error}
            />
          ) : showResult ? (
            <Results
              result={result}
              onConfirm={() => {
                sessionStorage.setItem("dismissed-result", result.gameId);
                setDismissed(result.gameId);
              }}
            />
          ) : (
            <section className="card card-border">
              <div className="card-body">
                <p className="text-sm">房间码</p>
                <h1 className="text-4xl font-black tracking-widest">
                  {room.code}
                </h1>
                <label className="fieldset">
                  邀请链接
                  <input
                    className="input w-full"
                    readOnly
                    value={`${location.origin}/rooms/${room.code}`}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </label>
                <p role="status">
                  {room.phase === "COUNTDOWN"
                    ? "全员准备！3 秒后一起开始…"
                    : room.phase === "PLAYING"
                      ? "对局已开始"
                      : `全员在线并准备后开始 · 最多 ${room.config.maxRounds} 轮 · 每轮 ${room.config.roundSeconds} 秒`}
                </p>
                {room.countdownAt && (
                  <Remaining deadlineAt={room.countdownAt} offset={offset} />
                )}
                <h2 className="mt-5 card-title">
                  朋友们 · {room.members.length}/{room.config.capacity}
                </h2>
                <ul className="space-y-3">
                  {room.members.map((member) => (
                    <li
                      key={member.id}
                      className="
                        flex flex-wrap items-center justify-between gap-3
                        rounded-box bg-base-200 p-4
                      "
                    >
                      <span className="min-w-0 flex-1 wrap-break-word">
                        {member.name}
                        {member.id === room.hostId ? " · 房主" : ""}
                        {member.id === snapshot?.playerId ? " · 你" : ""}
                      </span>
                      <span className="badge">
                        {member.online
                          ? member.ready
                            ? "已准备"
                            : "未准备"
                          : "断线"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    className="btn btn-primary"
                    autoFocus
                    disabled={!online || busy || room.phase === "PLAYING"}
                    onClick={() =>
                      void act(() =>
                        send("player:ready", {
                          ready: !room.members.find(
                            (member) => member.id === snapshot?.playerId,
                          )?.ready,
                        }),
                      )
                    }
                  >
                    {room.members.find(
                      (member) => member.id === snapshot?.playerId,
                    )?.ready
                      ? "取消准备"
                      : "准备"}
                  </button>
                </div>
                <LobbySettings
                  key={JSON.stringify(room.config) + room.hostId}
                  room={room}
                  playerId={snapshot!.playerId}
                  disabled={!online || busy}
                  action={action}
                />
                <button
                  className="btn mt-5 self-start"
                  disabled={!online || busy}
                  onClick={() =>
                    void act(async () => {
                      const ack = await send("room:leave", {});
                      if (ack.ok) history.replaceState(null, "", "/");
                      return ack;
                    })
                  }
                >
                  离开房间
                </button>
              </div>
            </section>
          )}
          {room.game && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="btn"
                disabled={!online || busy || !room.game.mine.active}
                onClick={() =>
                  void action("game:forfeit", {
                    gameId: room.game!.id,
                    round: room.game!.round,
                  })
                }
              >
                放弃本局，留在房间
              </button>
              <button
                className="btn"
                disabled={!online || busy}
                onClick={() =>
                  void action("room:leave", {}).then((ok) => {
                    if (ok) history.replaceState(null, "", "/");
                  })
                }
              >
                离开房间
              </button>
            </div>
          )}
          <History
            key={room.game?.id ?? room.result?.gameId ?? room.code}
            room={room}
            disabled={!online}
          />
        </>
      )}
    </main>
  );
}
