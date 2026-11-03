import type { RoomView } from "../shared/protocol.js";
import type { Action } from "./App.js";
import { Remaining } from "./game-screen.js";
import { useLocale } from "./i18n/locale.js";
import { LobbySettings } from "./lobby-settings.js";
import type { Feedback } from "./presentation.js";

export function LobbyScreen({
  room,
  playerId,
  disabled,
  offset,
  action,
  feedback,
}: {
  room: RoomView;
  playerId: string;
  disabled: boolean;
  offset: number;
  action: Action;
  feedback: Feedback | null;
}) {
  const { t } = useLocale();
  const readyCount = room.members.filter(
    (member) => member.online && member.ready,
  ).length;
  const mine = room.members.find((member) => member.id === playerId);
  return (
    <section className="card bg-base-100 card-border">
      <div
        className="
          card-body gap-5 p-4
          sm:p-6
        "
      >
        <div>
          <p className="text-sm">{t.lobby.inviteHint}</p>
          <h1
            className="
              mt-1 text-3xl font-black tracking-widest
              sm:text-4xl
            "
          >
            {room.code}
          </h1>
        </div>
        <label className="fieldset">
          {t.lobby.inviteLink}
          <input
            className="input w-full"
            readOnly
            value={`${location.origin}/rooms/${room.code}`}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <div className="space-y-3 rounded-box bg-base-200 p-4">
          <p role="status" className="font-semibold">
            {room.phase === "COUNTDOWN"
              ? t.lobby.allReady
              : t.lobby.readyProgress(readyCount, room.members.length)}
          </p>
          <progress
            className="progress"
            value={readyCount}
            max={room.members.length}
            aria-label={t.lobby.readyProgressLabel}
          />
          {room.countdownAt !== null && (
            <Remaining
              deadlineAt={room.countdownAt}
              offset={offset}
              emphasize
            />
          )}
          <button
            className="btn w-full btn-primary"
            disabled={disabled || room.phase === "PLAYING"}
            onClick={() => void action("player:ready", { ready: !mine?.ready })}
          >
            {mine?.ready ? t.lobby.cancelReady : t.lobby.ready}
          </button>
          <p className="text-sm">
            {t.lobby.startConditions(
              room.config.maxRounds,
              room.config.roundSeconds,
            )}
          </p>
        </div>
        <details
          className="collapse-arrow collapse border border-base-300"
          open={room.members.length <= 6}
        >
          <summary className="collapse-title font-semibold">
            {t.lobby.membersSummary(room.members.length, room.config.capacity)}
          </summary>
          <div className="collapse-content">
            <ul
              className="
                grid gap-2
                sm:grid-cols-2
              "
            >
              {room.members.map((member) => (
                <li
                  key={member.id}
                  data-confirm={
                    member.ready && feedback?.readyIds.includes(member.id)
                      ? feedback.id
                      : undefined
                  }
                  className="
                    flex min-w-0 flex-wrap items-center justify-between gap-2
                    rounded-box bg-base-200 p-3
                  "
                >
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    {member.name}
                    {member.id === room.hostId ? ` · ${t.lobby.host}` : ""}
                    {member.id === playerId ? ` · ${t.lobby.you}` : ""}
                  </span>
                  <span className="badge shrink-0">
                    {member.online
                      ? member.ready
                        ? t.lobby.memberReady
                        : t.lobby.memberNotReady
                      : t.lobby.memberOffline}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
        <details className="collapse-arrow collapse border border-base-300">
          <summary className="collapse-title font-semibold">
            {t.lobby.settingsSummary}
          </summary>
          <div className="collapse-content">
            <LobbySettings
              key={JSON.stringify(room.config) + room.hostId}
              room={room}
              playerId={playerId}
              disabled={disabled}
              action={action}
            />
          </div>
        </details>
      </div>
    </section>
  );
}
