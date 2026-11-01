import assert from "node:assert/strict";
import test from "node:test";

import type { GameView, Result, RoundView } from "../shared/protocol.js";
import { advancePresentation, type PresentationInput } from "./presentation.js";
import type { RoomUpdate } from "./room-update.js";

const config = { capacity: 5, maxRounds: 2, roundSeconds: 60 };
const round: RoundView = {
  number: 1,
  completed: true,
  answers: [
    { id: "a", name: "A", word: "Apple", forfeited: false, points: 1 },
    { id: "b", name: "B", word: "apple", forfeited: false, points: 1 },
    { id: "c", name: "C", word: "梨", forfeited: false, points: 0 },
  ],
  groups: [{ word: "Apple", playerIds: ["a", "b"], points: 1 }],
};
function update(
  version: number,
  gameChanges: Partial<GameView> = {},
  connection = 1,
  baseline = false,
): RoomUpdate {
  return {
    connection,
    baseline,
    snapshot: {
      playerId: "a",
      serverNow: version * 1000,
      room: {
        code: "ABC234",
        version,
        hostId: "a",
        phase: "PLAYING",
        config,
        countdownAt: null,
        members: ["a", "b", "c"].map((id) => ({
          id,
          name: id,
          ready: false,
          online: true,
        })),
        result: null,
        game: {
          id: "game-1",
          config,
          round: 1,
          phase: "COLLECTING",
          deadlineAt: 60000,
          players: ["a", "b", "c"].map((id) => ({
            id,
            name: id,
            score: 0,
            forfeit: null,
          })),
          submittedIds: [],
          previousRound: null,
          mine: { active: true, answer: null },
          ...gameChanges,
        },
      },
    },
  };
}
function finish(
  version: number,
  reason: Result["reason"] = "success",
): RoomUpdate {
  const next = update(version);
  next.snapshot.room!.game = null;
  next.snapshot.room!.phase = "WAITING";
  next.snapshot.room!.result = {
    gameId: "game-1",
    reason,
    commonWord: reason === "success" ? "相遇" : null,
    initialCount: 3,
    finalCount: 3,
    forfeitCount: 0,
    startedAt: 0,
    endedAt: 1000,
    durationMs: 1000,
    roundsStarted: 1,
    players: [],
    finalRound: round,
  };
  return next;
}
const input = (
  next: RoomUpdate,
  changes: Partial<PresentationInput> = {},
): PresentationInput => ({
  update: next,
  online: true,
  visible: true,
  reducedMotion: false,
  showResult: !next.snapshot.room?.game,
  ...changes,
});

test("initial and reconnect baselines never celebrate; later live rounds do", () => {
  const revealing = update(2, { phase: "REVEALING", previousRound: round });
  let state = advancePresentation(null, input(revealing));
  assert.equal(state.feedback, null);
  state = advancePresentation(
    state,
    input(update(3, { round: 2, previousRound: round }, 2, true)),
  );
  assert.equal(state.feedback, null);
  state = advancePresentation(
    state,
    input(
      update(
        4,
        {
          round: 2,
          phase: "REVEALING",
          previousRound: { ...round, number: 2 },
        },
        2,
      ),
    ),
  );
  assert.equal(state.feedback?.revealRound, 2);
});

test("duplicate versions do not grant another reveal; direct terminal states are handled", () => {
  let state = advancePresentation(null, input(update(1)));
  state = advancePresentation(
    state,
    input(update(2, { phase: "REVEALING", previousRound: round })),
  );
  const feedback = state.feedback;
  assert.equal(feedback?.revealRound, 1);
  state = advancePresentation(
    { ...state, feedback: null },
    input(update(2, { phase: "REVEALING", previousRound: round })),
  );
  assert.equal(state.feedback, null);
  state = advancePresentation(state, input(finish(3)));
  assert.equal(state.feedback?.success, true);
  assert.equal(state.feedback?.revealRound, null);
});

test("a completed final partial match can celebrate without success confetti", () => {
  const state = advancePresentation(
    advancePresentation(null, input(update(1))),
    input(finish(2, "round_limit")),
  );
  assert.equal(state.feedback?.revealRound, 1);
  assert.equal(state.feedback?.success, false);
});

test("another player's readiness preserves feedback until personal result confirmation", () => {
  let state = advancePresentation(null, input(update(1)));
  state = advancePresentation(state, input(finish(2)));
  const successFeedback = state.feedback;
  const ready = finish(3);
  ready.snapshot.room!.members[1]!.ready = true;
  state = advancePresentation(state, input(ready));
  assert.equal(state.feedback, successFeedback);
  assert.equal(state.feedback?.success, true);

  state = advancePresentation(state, input(ready, { showResult: false }));
  assert.equal(state.feedback, null);
  const nextReady = finish(4);
  nextReady.snapshot.room!.members[1]!.ready = true;
  nextReady.snapshot.room!.members[2]!.ready = true;
  state = advancePresentation(state, input(nextReady, { showResult: false }));
  assert.deepEqual(state.feedback?.readyIds, ["c"]);
  assert.equal(state.feedback?.success, false);
});

test("references, acknowledged results and a new game do not replay old rounds", () => {
  let state = advancePresentation(null, input(update(1)));
  state = advancePresentation(
    state,
    input(update(2, { phase: "REVEALING", previousRound: round })),
  );
  state = advancePresentation(
    state,
    input(update(3, { round: 2, previousRound: round })),
  );
  assert.equal(state.feedback?.revealRound, null);
  assert.equal(state.feedback?.newRound, true);
  state = advancePresentation(state, input(finish(4)));
  assert.equal(state.feedback?.success, true);
  const finished = state.input.update!;
  state = advancePresentation(state, input(finished, { showResult: false }));
  assert.equal(state.feedback, null);
  state = advancePresentation(state, input(finish(5), { showResult: false }));
  assert.equal(state.feedback, null);
  const newGame = update(6, { id: "game-2" });
  newGame.snapshot.room!.result = {
    ...finish(5).snapshot.room!.result!,
    finalRound: { ...round, number: 2 },
  };
  state = advancePresentation(state, input(newGame));
  const newReveal = update(7, {
    id: "game-2",
    phase: "REVEALING",
    previousRound: round,
  });
  state = advancePresentation(state, input(newReveal));
  assert.equal(state.feedback?.revealRound, 1);
  const newSuccess = finish(8);
  newSuccess.snapshot.room!.result!.gameId = "game-2";
  state = advancePresentation(state, input(newSuccess));
  assert.equal(state.feedback?.success, true);
});

test("only accepted readiness and submissions produce confirmation", () => {
  let state = advancePresentation(null, input(update(1)));
  state = advancePresentation(state, input(update(1)));
  assert.equal(state.feedback, null);
  const ready = update(2);
  ready.snapshot.room!.members[0]!.ready = true;
  state = advancePresentation(state, input(ready));
  assert.deepEqual(state.feedback?.readyIds, ["a"]);
  const submitted = update(3, {
    submittedIds: ["a"],
    mine: { active: true, answer: "接受" },
  });
  state = advancePresentation(state, input(submitted));
  assert.equal(state.feedback?.locked, true);
  assert.deepEqual(state.feedback?.submittedIds, ["a"]);
});

test("hidden, offline and reduced-motion intervals consume missed feedback without replay", () => {
  for (const disabled of [
    { visible: false },
    { online: false },
    { reducedMotion: true },
  ]) {
    let state = advancePresentation(null, input(update(1)));
    state = advancePresentation(
      state,
      input(update(2, { phase: "REVEALING", previousRound: round }), disabled),
    );
    assert.equal(state.feedback, null);
    state = advancePresentation(state, input(state.input.update!));
    assert.equal(state.feedback, null);
    state = advancePresentation(
      state,
      input(
        update(3, {
          round: 2,
          phase: "REVEALING",
          previousRound: { ...round, number: 2 },
        }),
      ),
    );
    assert.equal(state.feedback?.revealRound, 2);
    state = advancePresentation(state, input(state.input.update!, disabled));
    assert.equal(state.feedback, null);
  }
});

test("unfinished final rounds and departures after reveal cannot create match rewards", () => {
  let state = advancePresentation(null, input(update(1)));
  const unfinished = finish(2, "insufficient_players");
  unfinished.snapshot.room!.result!.finalRound = {
    ...round,
    completed: false,
    groups: [],
  };
  state = advancePresentation(state, input(unfinished));
  assert.equal(state.feedback?.success, false);
  assert.equal(state.feedback?.revealRound, null);
  state = advancePresentation(null, input(update(1)));
  state = advancePresentation(
    state,
    input(update(2, { phase: "REVEALING", previousRound: round })),
  );
  const departed = update(3, { phase: "REVEALING", previousRound: round });
  departed.snapshot.room!.members.pop();
  state = advancePresentation({ ...state, feedback: null }, input(departed));
  assert.equal(state.feedback, null);
  assert.deepEqual(
    departed.snapshot.room!.game!.previousRound!.groups[0]?.playerIds,
    ["a", "b"],
  );
});
