import { useEffect, useRef } from "react";

import type { Result } from "../shared/protocol.js";
import { useLocale } from "./i18n/locale.js";
import type { Feedback } from "./presentation.js";
import { RoundAnswers } from "./round-answers.js";

export function Results({
  result,
  onConfirm,
  feedback,
}: {
  result: Result;
  onConfirm: () => void;
  feedback: Feedback | null;
}) {
  const { t, format } = useLocale();
  const reasons = {
    success: t.results.reasonSuccess,
    round_limit: t.results.reasonRoundLimit,
    insufficient_players: t.results.reasonInsufficient,
  };
  const forfeitReasons = {
    left: t.results.forfeitLeft,
    voluntary: t.results.forfeitVoluntary,
    timeout: t.results.forfeitTimeout,
  };
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
          {result.reason === "success"
            ? t.results.successBadge
            : t.results.endedBadge}
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
                {t.results.groupLine(group.playerIds.length, group.points)}
              </p>
            ))}
          </div>
        )}
        <p>
          {t.results.summary(
            result.initialCount,
            result.finalCount,
            result.forfeitCount,
          )}
        </p>
        <p>
          {t.results.rounds(
            result.roundsStarted,
            format.decimal(result.durationMs / 1000, 1),
          )}
        </p>
        <button className="btn mt-4 btn-primary" onClick={onConfirm}>
          {t.results.confirm}
        </button>
        <p className="text-sm">{t.results.confirmHint}</p>
        <details className="collapse-arrow collapse border border-base-300">
          <summary className="collapse-title font-semibold">
            {t.results.detailsSummary}
          </summary>
          <div className="collapse-content space-y-4">
            <p className="text-sm">
              {t.results.startedAt}
              {format.dateTime(result.startedAt)}
              <br />
              {t.results.endedAt}
              {format.dateTime(result.endedAt)}
            </p>
            <ol className="space-y-2">
              {[...result.players]
                .sort((a, b) => b.score - a.score)
                .map((player) => (
                  <li
                    key={player.id}
                    className="rounded-box bg-base-200 p-4 wrap-anywhere"
                  >
                    {t.results.rank(
                      1 +
                        result.players.filter(
                          (other) => other.score > player.score,
                        ).length,
                    )}
                    {result.players.some(
                      (other) =>
                        other.id !== player.id && other.score === player.score,
                    )
                      ? t.results.tied
                      : ""}{" "}
                    · {player.name} ·{" "}
                    <strong>{t.results.score(player.score)}</strong>
                    {player.forfeit && (
                      <p className="mt-1 text-sm">
                        {t.results.forfeitLine(
                          player.forfeit.round,
                          forfeitReasons[player.forfeit.reason],
                        )}
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
