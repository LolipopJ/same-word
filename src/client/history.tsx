import { useEffect, useRef, useState } from "react";

import type { HistoryPage, RoomView } from "../shared/protocol.js";
import { useLocale } from "./i18n/locale.js";
import { RoundAnswers } from "./round-answers.js";

export function History({
  room,
  disabled,
}: {
  room: RoomView;
  disabled: boolean;
}) {
  const { t } = useLocale();
  const [selected, setSelected] = useState(
    room.game?.id ?? room.result?.gameId ?? "",
  );
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [target, setTarget] = useState(1);
  const [historyError, setHistoryError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  async function load(after = 0, gameId = selected) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setHistoryError(false);
    setPage(null);
    try {
      const response = await fetch(
        `/api/rooms/${room.code}/games/${gameId}/rounds?after=${after}`,
        { signal: controller.signal },
      );
      const data = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok || data === null) {
        setHistoryError(true);
        return;
      }
      setPage(data);
    } catch {
      if (!controller.signal.aborted) setHistoryError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  if (!room.game && !room.result) return null;
  return (
    <section className="mt-6 rounded-box border border-base-300 p-5">
      <button
        className="btn"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) void load();
        }}
      >
        {open ? t.history.close : t.history.open}
      </button>
      {open && (
        <div className="mt-5 space-y-4">
          <label className="fieldset">
            {t.history.selectGame}
            <select
              className="select w-full"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                void load(0, event.target.value);
              }}
            >
              {room.game && (
                <option value={room.game.id}>{t.history.currentGame}</option>
              )}
              {room.result && (
                <option value={room.result.gameId}>{t.history.lastGame}</option>
              )}
            </select>
          </label>
          <form
            className="fieldset gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void load(target - 1);
            }}
          >
            <label htmlFor="history-round">{t.history.fromRound}</label>
            <input
              id="history-round"
              className="input"
              type="number"
              min={1}
              max={999}
              step={1}
              required
              value={target}
              onChange={(event) => setTarget(event.target.valueAsNumber)}
            />
            <button className="btn" disabled={disabled || loading}>
              {t.history.loadRound}
            </button>
          </form>
          {historyError && (
            <p className="alert alert-error" role="alert">
              {t.history.failed}
            </p>
          )}
          {loading ? (
            <p role="status">{t.history.loading}</p>
          ) : page?.rounds.length === 0 ? (
            <p>{t.history.empty}</p>
          ) : (
            page?.rounds.map((round) => (
              <RoundAnswers key={round.number} round={round} mode="history" />
            ))
          )}
          {page?.hasMore && (
            <button
              className="btn"
              disabled={disabled || loading}
              onClick={() => void load(page.nextAfter)}
            >
              {t.history.next}
            </button>
          )}
          <p className="text-sm">{t.history.note}</p>
        </div>
      )}
    </section>
  );
}
