import { useEffect, useRef, useState } from "react";

import type { GameView, Result, RoundView } from "../shared/protocol.js";
import type { Action } from "./App.js";

export function Remaining({
  deadlineAt,
  offset,
}: {
  deadlineAt: number;
  offset: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  return (
    <span
      className="font-mono text-3xl font-bold tabular-nums"
      aria-label="剩余秒数"
    >
      {Math.max(0, Math.ceil((deadlineAt - now - offset) / 1000))} 秒
    </span>
  );
}
export function RoundAnswers({ round }: { round: RoundView }) {
  return (
    <section className="mt-6 space-y-3">
      <h3 className="font-bold">
        第 {round.number} 轮 · {round.completed ? "已揭晓" : "已开始，未完成"}
      </h3>
      <ul
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        {round.answers.map((answer) => (
          <li
            key={answer.id}
            className="rounded-box border border-base-300 p-4"
          >
            <p className="text-2xl font-bold wrap-break-word">
              {answer.word ?? "未作答"}
            </p>
            <p className="mt-2 text-sm wrap-break-word">
              {answer.name} · {answer.forfeited ? "已弃权" : "有效"} · +
              {answer.points} 分
            </p>
          </li>
        ))}
      </ul>
      {round.groups
        .filter((group) => group.playerIds.length > 1)
        .map((group) => (
          <p className="badge h-auto badge-outline py-2" key={group.word}>
            同词组「{group.word}」· {group.playerIds.length} 人 · 每人 +
            {group.points}
          </p>
        ))}
    </section>
  );
}
export function GameScreen({
  game,
  action,
  disabled,
  offset,
  error,
}: {
  game: GameView;
  action: Action;
  disabled: boolean;
  offset: number;
  error: string;
}) {
  const [word, setWord] = useState("");
  return (
    <section className="card card-border">
      <div className="card-body gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-black">
            第 {game.round} / {game.config.maxRounds} 轮
          </h1>
          <Remaining deadlineAt={game.deadlineAt} offset={offset} />
        </div>
        <p role="status">
          {game.phase === "REVEALING"
            ? "一起揭晓，5 秒后进入下一轮。"
            : `已提交 ${game.submittedIds.filter((id) => game.players.some((player) => player.id === id && !player.forfeit)).length} / ${game.players.filter((player) => !player.forfeit).length} 人`}
        </p>
        {game.phase === "COLLECTING" &&
          (game.mine.active ? (
            game.mine.answer !== null ? (
              <p className="alert" role="status">
                你已提交「{game.mine.answer}」。等待朋友们，答案已锁定。
              </p>
            ) : (
              <form
                className="fieldset gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void action("game:submit", {
                    gameId: game.id,
                    round: game.round,
                    requestId: crypto.randomUUID(),
                    word,
                  });
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
                  aria-describedby="word-hint form-error"
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
                  提交词语
                </button>
              </form>
            )
          ) : (
            <p className="alert" role="status">
              你已弃权，可以继续查看本局进度。
            </p>
          ))}
        {game.previousRound && <RoundAnswers round={game.previousRound} />}
        <ul
          className="
            grid gap-2
            sm:grid-cols-2
          "
        >
          {game.players.map((player) => (
            <li
              key={player.id}
              className="
                flex flex-wrap justify-between gap-2 rounded-field bg-base-200
                p-3
              "
            >
              <span className="wrap-break-word">
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
    </section>
  );
}
const reasons = {
  success: "默契相遇！",
  round_limit: "轮数已用完",
  insufficient_players: "有效玩家不足 2 人",
};
const forfeitReasons = {
  left: "离开房间",
  voluntary: "主动弃权",
  timeout: "超时未答",
};
export function Results({
  result,
  onConfirm,
}: {
  result: Result;
  onConfirm: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section className="card card-border">
      <div className="card-body gap-5">
        <p className="badge">
          {result.reason === "success" ? "成功" : "本局结束"}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-black">
          {reasons[result.reason]}
        </h1>
        {result.commonWord && (
          <p className="text-5xl font-black wrap-break-word">
            {result.commonWord}
          </p>
        )}
        <p>
          {result.initialCount} 人开始 · {result.finalCount} 人完成 ·{" "}
          {result.forfeitCount} 人弃权
        </p>
        <p>
          已开始 {result.roundsStarted} 轮 · 耗时{" "}
          {(result.durationMs / 1000).toFixed(1)} 秒
        </p>
        <p className="text-sm">
          开始：{new Date(result.startedAt).toLocaleString()}
          <br />
          结束：{new Date(result.endedAt).toLocaleString()}
        </p>
        <ol className="space-y-2">
          {[...result.players]
            .sort((a, b) => b.score - a.score)
            .map((player) => (
              <li key={player.id} className="rounded-box bg-base-200 p-4">
                第{" "}
                {1 +
                  result.players.filter((other) => other.score > player.score)
                    .length}{" "}
                名
                {result.players.some(
                  (other) =>
                    other.id !== player.id && other.score === player.score,
                )
                  ? "（并列）"
                  : ""}{" "}
                · {player.name} · <strong>{player.score} 分</strong>
                {player.forfeit && (
                  <p className="mt-1 text-sm">
                    第 {player.forfeit.round} 轮 ·{" "}
                    {forfeitReasons[player.forfeit.reason]}
                  </p>
                )}
              </li>
            ))}
        </ol>
        <RoundAnswers round={result.finalRound} />
        <button className="btn mt-4 btn-primary" onClick={onConfirm}>
          确认，回到准备
        </button>
        <p className="text-sm">每个人独立确认。下一局仍需全员重新准备。</p>
      </div>
    </section>
  );
}
