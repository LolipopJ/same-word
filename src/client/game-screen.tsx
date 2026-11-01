import { useEffect, useState } from "react";

import type { GameView } from "../shared/protocol.js";
import type { Action } from "./App.js";
import type { Feedback } from "./presentation.js";
import { RoundAnswers } from "./round-answers.js";

export function Remaining({
  deadlineAt,
  offset,
  emphasize = false,
}: {
  deadlineAt: number;
  offset: number;
  emphasize?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((deadlineAt - now - offset) / 1000));
  return (
    <span
      className="font-mono text-3xl font-bold tabular-nums"
      aria-label="剩余秒数"
    >
      <span
        key={seconds}
        className="inline-block"
        data-countdown={emphasize || undefined}
      >
        {seconds}
      </span>{" "}
      秒
    </span>
  );
}
export function GameScreen({
  game,
  action,
  disabled,
  offset,
  error,
  feedback,
}: {
  game: GameView;
  action: Action;
  disabled: boolean;
  offset: number;
  error: string;
  feedback: Feedback | null;
}) {
  const [word, setWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <section
      className="card bg-base-100 card-border"
      data-round-entry={feedback?.newRound ? feedback.id : undefined}
    >
      <div
        className="
          card-body gap-5 p-4
          sm:p-6
        "
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black">
            第 {game.round} / {game.config.maxRounds} 轮
          </h1>
          <Remaining deadlineAt={game.deadlineAt} offset={offset} />
        </div>
        {game.phase === "REVEALING" && (
          <p role="status">一起揭晓，5 秒后进入下一轮。</p>
        )}
        {game.previousRound && (
          <RoundAnswers
            round={game.previousRound}
            mode={game.phase === "COLLECTING" ? "reference" : "reveal"}
            feedback={
              game.phase === "REVEALING" &&
              feedback?.revealRound === game.previousRound.number
                ? feedback.id
                : undefined
            }
          />
        )}
        {game.phase === "COLLECTING" &&
          (game.mine.active ? (
            game.mine.answer !== null ? (
              <p
                className="alert"
                role="status"
                data-confirm={feedback?.locked ? feedback.id : undefined}
              >
                你已提交「{game.mine.answer}」。等待朋友们，答案已锁定。
              </p>
            ) : (
              <form
                className="fieldset gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitting(true);
                  void action("game:submit", {
                    gameId: game.id,
                    round: game.round,
                    requestId: crypto.randomUUID(),
                    word,
                  }).finally(() => setSubmitting(false));
                }}
              >
                <label htmlFor="word">
                  {game.round === 1
                    ? "随意想一个词，作为起点"
                    : "连接上一轮的所有词，你会想到什么？"}
                </label>
                <input
                  id="word"
                  className="input w-full input-lg"
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  autoComplete="off"
                  autoFocus
                  aria-describedby={`word-hint${error ? " form-error" : ""}`}
                  aria-invalid={!!error}
                />
                {error && (
                  <a className="link text-error" href="#word">
                    修改词语后重新提交
                  </a>
                )}
                <p id="word-hint">
                  1～20 个字符 · 本局已揭晓的词不能再用 · 提交后无法修改
                </p>
                <button className="btn btn-primary" disabled={disabled}>
                  {submitting ? "正在提交…" : "提交词语"}
                </button>
              </form>
            )
          ) : (
            <p className="alert" role="status">
              你已弃权，可以继续查看本局进度。
            </p>
          ))}
        <p role="status">
          已提交{" "}
          {
            game.submittedIds.filter((id) =>
              game.players.some(
                (player) => player.id === id && !player.forfeit,
              ),
            ).length
          }{" "}
          / {game.players.filter((player) => !player.forfeit).length} 人
        </p>
        <details
          className="collapse-arrow collapse border border-base-300"
          open={game.players.length <= 6}
        >
          <summary className="collapse-title font-semibold">
            玩家状态与积分 · 查看全部 {game.players.length} 人
          </summary>
          <div className="collapse-content">
            <ul
              className="
                grid gap-2
                sm:grid-cols-2
              "
            >
              {game.players.map((player) => (
                <li
                  key={player.id}
                  data-confirm={
                    feedback?.submittedIds.includes(player.id)
                      ? feedback.id
                      : undefined
                  }
                  className="
                    flex flex-wrap justify-between gap-2 rounded-field
                    bg-base-200 p-3
                  "
                >
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    {player.name} · {player.score} 分
                  </span>
                  <span>
                    {player.forfeit
                      ? "已弃权"
                      : game.submittedIds.includes(player.id)
                        ? "已提交"
                        : "思考中"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>
    </section>
  );
}
