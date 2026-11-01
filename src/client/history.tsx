import { useEffect, useRef, useState } from "react";

import type { HistoryPage, RoomView } from "../shared/protocol.js";
import { RoundAnswers } from "./game-screen.js";

export function History({
  room,
  disabled,
}: {
  room: RoomView;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(
    room.game?.id ?? room.result?.gameId ?? "",
  );
  const [page, setPage] = useState<HistoryPage | null>(null);
  const [target, setTarget] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  async function load(after = 0, gameId = selected) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    setPage(null);
    try {
      const response = await fetch(
        `/api/rooms/${room.code}/games/${gameId}/rounds?after=${after}`,
        { signal: controller.signal },
      );
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.message ?? "无法读取历史");
      setPage(data);
    } catch (error) {
      if (!controller.signal.aborted) setError((error as Error).message);
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
        {open ? "收起历史" : "查看轮次历史"}
      </button>
      {open && (
        <div className="mt-5 space-y-4">
          <label className="fieldset">
            选择对局
            <select
              className="select w-full"
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                void load(0, event.target.value);
              }}
            >
              {room.game && <option value={room.game.id}>当前对局</option>}
              {room.result && (
                <option value={room.result.gameId}>最近结束的一局</option>
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
            <label htmlFor="history-round">从指定轮次查看</label>
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
              读取轮次
            </button>
          </form>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          {loading ? (
            <p role="status">正在读取历史…</p>
          ) : page?.rounds.length === 0 ? (
            <p>还没有已揭晓轮次。</p>
          ) : (
            page?.rounds.map((round) => (
              <RoundAnswers key={round.number} round={round} />
            ))
          )}
          {page?.hasMore && (
            <button
              className="btn"
              disabled={disabled || loading}
              onClick={() => void load(page.nextAfter)}
            >
              接下来 20 轮
            </button>
          )}
          <p className="text-sm">每次最多读取 20 轮，仅显示已揭晓答案。</p>
        </div>
      )}
    </section>
  );
}
