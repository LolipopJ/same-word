import { useEffect, useRef } from "react";

import type { Result } from "../shared/protocol.js";
import type { Feedback } from "./presentation.js";
import { RoundAnswers } from "./round-answers.js";

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
  feedback,
}: {
  result: Result;
  onConfirm: () => void;
  feedback: Feedback | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section
      className="card bg-base-100 card-border"
      data-result-entry={feedback?.result ? feedback.id : undefined}
    >
      <div
        className="
          card-body gap-5 p-4
          sm:p-6
        "
      >
        <p className="badge">
          {result.reason === "success" ? "成功" : "本局结束"}
        </p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="
            text-3xl font-black
            sm:text-4xl
          "
        >
          {reasons[result.reason]}
        </h1>
        {result.commonWord && (
          <p
            className="
              text-4xl font-black wrap-anywhere
              sm:text-5xl
            "
            data-success={feedback?.success ? feedback.id : undefined}
          >
            {result.commonWord}
          </p>
        )}
        {result.reason === "success" && (
          <div
            className="space-y-1 font-semibold"
            data-success={feedback?.success ? feedback.id : undefined}
          >
            {result.finalRound.groups.map((group) => (
              <p key={group.word}>
                {group.playerIds.length} 人同词 · 每人 +{group.points} 分
              </p>
            ))}
          </div>
        )}
        <p>
          {result.initialCount} 人开始 · {result.finalCount} 人完成 ·{" "}
          {result.forfeitCount} 人弃权
        </p>
        <p>
          已开始 {result.roundsStarted} 轮 · 耗时{" "}
          {(result.durationMs / 1000).toFixed(1)} 秒
        </p>
        <button className="btn mt-4 btn-primary" onClick={onConfirm}>
          确认，回到准备
        </button>
        <p className="text-sm">每个人独立确认。下一局仍需全员重新准备。</p>
        <details className="collapse-arrow collapse border border-base-300">
          <summary className="collapse-title font-semibold">
            查看完整排名、时间与弃权明细
          </summary>
          <div className="collapse-content space-y-4">
            <p className="text-sm">
              开始：{new Date(result.startedAt).toLocaleString()}
              <br />
              结束：{new Date(result.endedAt).toLocaleString()}
            </p>
            <ol className="space-y-2">
              {[...result.players]
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <li
                    key={player.id}
                    className="rounded-box bg-base-200 p-4 wrap-anywhere"
                  >
                    第{" "}
                    {1 +
                      result.players.filter(
                        (other) => other.score > player.score,
                      ).length}{" "}
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
          </div>
        </details>
        <RoundAnswers
          round={result.finalRound}
          mode="result"
          feedback={
            feedback?.revealRound === result.finalRound.number
              ? feedback.id
              : undefined
          }
        />
      </div>
    </section>
  );
}
