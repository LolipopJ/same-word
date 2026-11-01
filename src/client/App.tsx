import { useEffect, useRef, useState } from "react";

import type { Ack, Command, Payload } from "../shared/protocol.js";
import { GameScreen } from "./game-screen.js";
import { History } from "./history.js";
import { HomeScreen } from "./home-screen.js";
import { LobbyScreen } from "./lobby-screen.js";
import { Results } from "./results.js";
import { SuccessConfetti } from "./success-confetti.js";
import { ThemeSwitcher } from "./theme-switcher.js";
import { usePresentation } from "./use-presentation.js";
import { useRoom } from "./use-room.js";

export type Action = <K extends Command>(
  event: K,
  payload: Payload<K>,
) => Promise<boolean>;
export default function App() {
  const { snapshot, update, status, send, offset } = useRoom();
  const inviteCode = location.pathname.startsWith("/rooms/")
    ? (location.pathname.split("/")[2] ?? "").toUpperCase()
    : null;
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
  const { feedback, motionEnabled } = usePresentation(
    update,
    online,
    !!showResult,
  );
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
        mx-auto max-w-4xl
        px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))]
        pt-[max(1rem,env(safe-area-inset-top))]
        pb-[max(1.5rem,env(safe-area-inset-bottom))]
        sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))]
        sm:pt-[max(2rem,env(safe-area-inset-top))]
      "
      data-feedback={feedback?.id}
      data-motion={motionEnabled ? "on" : "off"}
    >
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <a
          href="/"
          className="
            inline-flex min-h-11 items-center gap-2 text-xl font-black
            tracking-tight
          "
        >
          同词 <span className="text-sm font-medium">Same word</span>
        </a>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="badge h-auto badge-outline py-1 text-center">
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
          className="mb-5 alert wrap-anywhere alert-error"
        >
          {error}
        </p>
      )}
      {!room ? (
        <HomeScreen
          inviteCode={inviteCode}
          online={online}
          disabled={!online || busy}
          error={error}
          action={action}
        />
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
              feedback={feedback}
            />
          ) : showResult ? (
            <Results
              result={result}
              feedback={feedback}
              onConfirm={() => {
                sessionStorage.setItem("dismissed-result", result.gameId);
                setDismissed(result.gameId);
              }}
            />
          ) : (
            <LobbyScreen
              room={room}
              playerId={snapshot!.playerId}
              disabled={!online || busy}
              offset={offset}
              action={action}
              feedback={feedback}
            />
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
      {showResult && feedback?.success && (
        <SuccessConfetti key={feedback.id} requestId={feedback.id} />
      )}
    </main>
  );
}
