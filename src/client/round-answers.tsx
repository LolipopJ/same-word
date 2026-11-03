import type { RoundView } from "../shared/protocol.js";
import { GroupStars } from "./group-stars.js";
import { useLocale } from "./i18n/locale.js";

export function RoundAnswers({
  round,
  mode = "history",
  feedback: requestedFeedback,
}: {
  round: RoundView;
  mode?: "reveal" | "reference" | "result" | "history";
  feedback?: string;
}) {
  const { t } = useLocale();
  const compact = mode === "reference" || mode === "result";
  const feedback =
    mode === "reveal" || mode === "result" ? requestedFeedback : undefined;
  const visible = compact ? round.answers.slice(0, 4) : round.answers;
  const remaining = round.answers.slice(visible.length);
  const matchedGroups = round.completed
    ? round.groups.filter((group) => group.playerIds.length > 1)
    : [];
  const groupByPlayer = new Map(
    matchedGroups.flatMap((group, index) =>
      group.playerIds.map((id) => [id, index] as const),
    ),
  );
  const answers = (items: RoundView["answers"]) => (
    <ul
      className="
        grid gap-2
        sm:grid-cols-2
      "
    >
      {items.map((answer) => (
        <li
          key={answer.id}
          data-group={
            groupByPlayer.has(answer.id)
              ? groupByPlayer.get(answer.id)
              : undefined
          }
          data-group-tone={
            groupByPlayer.has(answer.id)
              ? groupByPlayer.get(answer.id)! % 2
              : undefined
          }
          data-group-pulse={
            feedback && groupByPlayer.has(answer.id) ? feedback : undefined
          }
          className="min-w-0 rounded-box border border-base-300 p-3"
        >
          <p className="text-xl font-bold wrap-anywhere">
            {answer.word ?? t.answers.unanswered}
          </p>
          <p className="mt-2 text-sm wrap-anywhere">
            {answer.name} ·{" "}
            {answer.forfeited ? t.answers.forfeited : t.answers.valid} ·{" "}
            {t.answers.points(answer.points)}
          </p>
          {groupByPlayer.has(answer.id) && (
            <p className="mt-1 text-sm font-semibold">
              {t.answers.groupTag(groupByPlayer.get(answer.id)! + 1)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
  const groups = matchedGroups.length > 0 && (
    <ul
      className="
        grid gap-2
        sm:grid-cols-2
      "
      aria-label={t.answers.groupsLabel}
    >
      {matchedGroups.map((group, index) => (
        <li
          className="min-w-0 rounded-field border border-base-300 p-3"
          data-group={index}
          data-group-tone={index % 2}
          data-group-pulse={feedback}
          key={group.word}
        >
          <p className="text-sm font-semibold">
            {t.answers.groupSummary(
              index + 1,
              group.playerIds.length,
              group.points,
            )}
          </p>
          <p className="mt-1 text-xl font-bold wrap-anywhere">{group.word}</p>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="relative space-y-3" data-reveal={feedback}>
      {feedback && matchedGroups.length > 0 && <GroupStars key={feedback} />}
      <h3 className="font-bold">
        {round.completed
          ? t.answers.roundCompleted(round.number)
          : t.answers.roundIncomplete(round.number)}
      </h3>
      {(mode !== "reference" || remaining.length === 0) && groups}
      {answers(visible)}
      {remaining.length > 0 ? (
        <details className="collapse-arrow collapse border border-base-300">
          <summary className="collapse-title font-semibold">
            {t.answers.expandAll(round.answers.length)}
          </summary>
          <div className="collapse-content space-y-3">
            {mode === "reference" && groups}
            {answers(remaining)}
          </div>
        </details>
      ) : null}
    </section>
  );
}
