import { useEffect, useState } from "react";

import type { GameView } from "../shared/protocol.js";
import type { Action } from "./App.js";
import { override, useLocale } from "./i18n/locale.js";
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
  const { t } = useLocale();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.ceil((deadlineAt - now - offset) / 1000));
  return (
    <span
      className="font-mono text-3xl font-bold tabular-nums"
      aria-label={t.game.remainingLabel}
    >
      <span
        key={seconds}
        className="inline-block"
        data-countdown={emphasize || undefined}
      >
        {seconds}
      </span>{" "}
      {t.game.remainingSuffix}
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
  const { t } = useLocale();
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
            {t.game.roundTitle(game.round, game.config.maxRounds)}
          </h1>
          <Remaining deadlineAt={game.deadlineAt} offset={offset} />
        </div>
        {game.phase === "REVEALING" && <p role="status">{t.game.revealing}</p>}
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
                {t.game.submitted(game.mine.answer)}
              </p>
            ) : (
              <form
                className="fieldset gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSubmitting(true);
                  void action(
                    "game:submit",
                    {
                      gameId: game.id,
                      round: game.round,
                      requestId: crypto.randomUUID(),
                      word,
                    },
                    override("INVALID_INPUT", "invalidWord"),
                  ).finally(() => setSubmitting(false));
                }}
              >
                <label htmlFor="word">
                  {game.round === 1 ? t.game.firstPrompt : t.game.linkPrompt}
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
                    {t.game.fixAndResubmit}
                  </a>
                )}
                <p id="word-hint">{t.game.inputHint}</p>
                <button className="btn btn-primary" disabled={disabled}>
                  {submitting ? t.game.submitting : t.game.submit}
                </button>
              </form>
            )
          ) : (
            <p className="alert" role="status">
              {t.game.forfeited}
            </p>
          ))}
        <p role="status">
          {t.game.submittedCount(
            game.submittedIds.filter((id) =>
              game.players.some(
                (player) => player.id === id && !player.forfeit,
              ),
            ).length,
            game.players.filter((player) => !player.forfeit).length,
          )}
        </p>
        <details
          className="collapse-arrow collapse border border-base-300"
          open={game.players.length <= 6}
        >
          <summary className="collapse-title font-semibold">
            {t.game.playersSummary(game.players.length)}
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
                    {t.game.playerLine(player.name, player.score)}
                  </span>
                  <span>
                    {player.forfeit
                      ? t.game.playerForfeited
                      : game.submittedIds.includes(player.id)
                        ? t.game.playerSubmitted
                        : t.game.playerThinking}
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
