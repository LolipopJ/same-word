import { useEffect, useRef, useState } from "react";

import type { Ack, Command, ErrorCode, Payload } from "../shared/protocol.js";
import { GameScreen } from "./game-screen.js";
import { History } from "./history.js";
import { HomeScreen } from "./home-screen.js";
import { type ErrorDescriptor, useLocale } from "./i18n/locale.js";
import { LanguageSwitcher } from "./language-switcher.js";
import { LobbyScreen } from "./lobby-screen.js";
import { Results } from "./results.js";
import { SuccessConfetti } from "./success-confetti.js";
import { ThemeSwitcher } from "./theme-switcher.js";
import { usePresentation } from "./use-presentation.js";
import { useRoom } from "./use-room.js";

export type Action = <K extends Command>(
  event: K,
  payload: Payload<K>,
  overrides?: Partial<Record<ErrorCode, ErrorDescriptor>>,
) => Promise<boolean>;
export default function App() {
  const { snapshot, update, status, send, offset } = useRoom();
  const { t, describe, errorText } = useLocale();
  const inviteCode = location.pathname.startsWith("/rooms/")
    ? (location.pathname.split("/")[2] ?? "").toUpperCase()
    : null;
  const [error, setError] = useState<ErrorDescriptor | null>(null);
  const errorMessage = error ? errorText(error) : "";
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
    setError(null);
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
  async function act(
    operation: () => Promise<Ack>,
    overrides: Partial<Record<ErrorCode, ErrorDescriptor>> = {},
  ) {
    setBusy(true);
    setError(null);
    try {
      const ack = await operation();
      if (!ack.ok)
        setError(overrides[ack.code] ?? { kind: "code", code: ack.code });
    } catch (error) {
      setError(describe(error));
    } finally {
      setBusy(false);
    }
  }
  const action: Action = async (event, payload, overrides) => {
    let success = false;
    await act(async () => {
      const ack = await send(event, payload);
      success = ack.ok;
      return ack;
    }, overrides);
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
          <img
            src="/icon.svg"
            width="32"
            height="32"
            alt=""
            className="size-8"
          />
          {t.app.brand}
        </a>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="badge h-auto badge-outline py-1 text-center">
            {online
              ? t.app.statusOnline
              : status === "replaced"
                ? t.app.statusReplaced
                : t.app.statusReconnecting}
          </span>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>
      {!online && (
        <p className="mb-5 alert" role="status">
          {status === "replaced"
            ? t.app.replacedNotice
            : t.app.reconnectingNotice}
          <button className="btn" onClick={() => location.reload()}>
            {t.app.reconnect}
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
          {errorMessage}
        </p>
      )}
      {!room ? (
        <HomeScreen
          inviteCode={inviteCode}
          online={online}
          disabled={!online || busy}
          error={errorMessage}
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
              error={errorMessage}
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
                {t.app.forfeit}
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
                {t.app.leave}
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
