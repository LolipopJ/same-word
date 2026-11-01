import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { defaultConfig } from "../shared/protocol.js";
import { advanceGame, createGame, forfeit, gameView, submit } from "./game.js";
import { Rooms } from "./rooms.js";
import { Sessions } from "./sessions.js";

const start = { mono: 1000, wall: 1_700_000_000_000 };
function game() {
  return createGame(
    [
      { id: "a", name: "Alice" },
      { id: "b", name: "Bob" },
    ],
    { ...defaultConfig, maxRounds: 2 },
    start,
  );
}
function answer(
  g: ReturnType<typeof game>,
  id: string,
  word: string,
  mono = 1001,
) {
  return submit(
    g,
    id,
    { gameId: g.id, round: g.round.number, requestId: randomUUID(), word },
    { mono, wall: start.wall + mono - 1000 },
  );
}
test("round one keeps other answers private, locks the first answer and reveals early", () => {
  const g = game();
  assert.equal(g.round.number, 1);
  answer(g, "a", "secret");
  assert.equal(gameView(g, "a", start).mine.answer, "secret");
  assert.equal(
    JSON.stringify(gameView(g, "b", start)).includes("secret"),
    false,
  );
  assert.throws(() => answer(g, "a", "changed"));
  assert.throws(() => answer(g, "b", "\n"));
  assert.equal(gameView(g, "b", start).mine.answer, null);
  answer(g, "b", "different");
  assert.equal(g.phase, "REVEALING");
  assert.equal(g.history.length, 1);
  advanceGame(g, { mono: 6000, wall: start.wall + 5000 });
  assert.equal(g.round.number, 1);
  advanceGame(g, { mono: 6001, wall: start.wall + 5001 });
  assert.equal(g.round.number, 2);
});
test("first-round success gives exactly 100 points even with a two-round limit", () => {
  const g = game();
  answer(g, "a", " Apple ");
  answer(g, "b", "apple");
  assert.equal(g.result?.reason, "success");
  assert.equal(g.result?.roundsStarted, 1);
  assert.deepEqual(
    g.players.map((player) => player.score),
    [100, 100],
  );
});
test("last-round success wins over the round limit; different words exhaust it", () => {
  for (const success of [true, false]) {
    const g = game();
    answer(g, "a", "a");
    answer(g, "b", "b");
    advanceGame(g, { mono: 6001, wall: start.wall + 5001 });
    answer(g, "a", "c", 6002);
    answer(g, "b", success ? "C" : "d", 6002);
    assert.equal(g.result?.reason, success ? "success" : "round_limit");
  }
});
test("exactly at deadline is too late and an incomplete round gets no points", () => {
  const g = game();
  answer(g, "a", "hello");
  assert.throws(() => answer(g, "b", "hello", 61_000));
  assert.equal(g.result?.reason, "insufficient_players");
  assert.equal(g.result?.finalCount, 1);
  assert.equal(g.result?.finalRound.completed, false);
  assert.deepEqual(
    g.players.map((player) => player.score),
    [0, 0],
  );
  advanceGame(g, { mono: 99_000, wall: start.wall + 98_000 });
  assert.equal(g.history.length, 1);
});
test("a last-moment answer settles once, while a 600-second limit still reveals early", () => {
  for (const seconds of [1, 600]) {
    const g = createGame(
      [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
      { ...defaultConfig, roundSeconds: seconds },
      start,
    );
    answer(g, "a", "common");
    answer(g, "b", "COMMON", seconds === 1 ? 1999 : 11_000);
    const result = structuredClone(g.result);
    advanceGame(g, { mono: 1_000_000, wall: start.wall + 999_000 });
    assert.deepEqual(g.result, result);
    assert.equal(g.history.length, 1);
    assert.deepEqual(
      g.players.map((player) => player.score),
      [100, 100],
    );
  }
});
function multiplayer(count = 5) {
  return createGame(
    Array.from({ length: count }, (_, index) => ({
      id: String(index),
      name: `Player ${index}`,
    })),
    { ...defaultConfig, maxRounds: 2 },
    start,
  );
}
test("multiple matching groups score independently and the final round keeps partial points", () => {
  const g = multiplayer();
  ["apple", "APPLE", "banana", "banana", "pear"].forEach((word, index) =>
    answer(g, String(index), word),
  );
  assert.deepEqual(
    g.players.map((player) => player.score),
    [1, 1, 1, 1, 0],
  );
  advanceGame(g, { mono: 6001, wall: start.wall + 5001 });
  ["cat", "CAT", "dog", "DOG", "bird"].forEach((word, index) =>
    answer(g, String(index), word, 6002),
  );
  assert.equal(g.result?.reason, "round_limit");
  assert.deepEqual(
    g.result?.players.map((player) => player.score),
    [2, 2, 2, 2, 0],
  );
});
test("a submitted forfeit is revealed but excluded from scoring and cannot rejoin", () => {
  const g = multiplayer();
  answer(g, "0", "apple");
  forfeit(g, "0", "voluntary", { mono: 1002, wall: start.wall + 2 });
  answer(g, "1", "apple");
  answer(g, "2", "banana");
  answer(g, "3", "pear");
  forfeit(g, "4", "left", { mono: 1003, wall: start.wall + 3 });
  assert.deepEqual(
    g.players.map((player) => player.score),
    [0, 0, 0, 0, 0],
  );
  assert.equal(g.history[0]?.answers[0]?.forfeited, true);
  advanceGame(g, { mono: 6003, wall: start.wall + 5003 });
  assert.throws(() => answer(g, "0", "back", 6004));
  for (const id of ["1", "2", "3"]) answer(g, id, "together", 6004);
  assert.equal(g.result?.reason, "success");
  assert.equal(g.result?.initialCount, 5);
  assert.equal(g.result?.finalCount, 3);
  assert.deepEqual(
    g.players.map((player) => player.score),
    [0, 100, 100, 100, 0],
  );
});
test("leaving during reveal preserves points; dropping to one player finishes immediately", () => {
  const g = multiplayer(4);
  ["a", "a", "b", "c"].forEach((word, index) => answer(g, String(index), word));
  forfeit(g, "0", "left", { mono: 1002, wall: start.wall + 2 });
  assert.equal(g.players[0]?.score, 1);
  assert.equal(g.phase, "REVEALING");
  forfeit(g, "1", "left", { mono: 1003, wall: start.wall + 3 });
  forfeit(g, "2", "left", { mono: 1004, wall: start.wall + 4 });
  assert.equal(g.result?.reason, "insufficient_players");
  assert.deepEqual(
    g.players.map((player) => player.score),
    [1, 1, 0, 0],
  );
});
test("revealed history keys include other players and forfeited answers, while new games reset them", () => {
  const g = multiplayer(4);
  answer(g, "0", "Bridge");
  forfeit(g, "0", "voluntary", { mono: 1002, wall: start.wall + 2 });
  answer(g, "1", "Apple");
  answer(g, "2", "banana");
  answer(g, "3", "pear");
  advanceGame(g, { mono: 6001, wall: start.wall + 5001 });
  const deadline = g.deadline;
  for (const word of [" bridge ", "APPLE", "Banana"]) {
    assert.throws(() => answer(g, "1", word, 6002), {
      code: "HISTORICAL_WORD",
    });
    assert.equal(
      gameView(g, "1", { mono: 6002, wall: start.wall + 5002 }).mine.answer,
      null,
    );
    assert.equal(g.deadline, deadline);
  }
  for (const id of ["1", "2", "3"]) answer(g, id, "new", 6002);
  assert.equal(g.result?.reason, "success");
  const fresh = multiplayer(2);
  answer(fresh, "0", "Bridge");
  answer(fresh, "1", "bridge");
  assert.equal(fresh.result?.reason, "success");
});
test("accepted request replay returns the same receipt across rounds and after the result", () => {
  for (const finish of [true, false]) {
    const g = game();
    const request = {
      gameId: g.id,
      round: 1,
      requestId: randomUUID(),
      word: "first",
    };
    const ack = submit(g, "a", request, start);
    answer(g, "b", finish ? "FIRST" : "different");
    if (!finish) advanceGame(g, { mono: 6001, wall: start.wall + 5001 });
    assert.deepEqual(
      submit(g, "a", request, { mono: 6002, wall: start.wall + 5002 }),
      ack,
    );
    assert.throws(
      () =>
        submit(
          g,
          "a",
          { ...request, requestId: randomUUID() },
          { mono: 6002, wall: start.wall + 5002 },
        ),
      { code: "STALE_REQUEST" },
    );
    assert.equal(g.history.length, 1);
  }
});
test("an early timer is rescheduled and cancelled or stale callbacks cannot start or settle a game", (t) => {
  const callbacks: (() => void)[] = [];
  t.mock.method(globalThis, "setTimeout", (callback: () => void) => {
    callbacks.push(callback);
    return { unref() {} };
  });
  t.mock.method(globalThis, "clearTimeout", () => {});
  let now = { mono: 0, wall: start.wall };
  const rooms = new Rooms(() => now);
  const sessions = new Sessions();
  const a = sessions.restore(undefined, 0);
  const b = sessions.restore(undefined, 0);
  a.connectionId = "a";
  b.connectionId = "b";
  rooms.create(a, "A");
  rooms.join(b, a.roomCode!, "B");
  rooms.ready(a, true);
  rooms.ready(b, true);
  const cancelled = callbacks.at(-1)!;
  rooms.ready(a, false);
  cancelled();
  assert.equal(rooms.room(a).phase, "WAITING");
  rooms.ready(a, true);
  const early = callbacks.at(-1)!;
  now = { mono: 2999, wall: start.wall + 2999 };
  early();
  assert.equal(rooms.room(a).phase, "COUNTDOWN");
  assert.notEqual(callbacks.at(-1), early);
  now = { mono: 3000, wall: start.wall - 999_000 };
  callbacks.at(-1)!();
  const game = rooms.room(a).game!;
  assert.equal(game.round.number, 1);
  const stale = callbacks.at(-1)!;
  for (const player of [a, b])
    rooms.submit(player, {
      gameId: game.id,
      round: 1,
      requestId: randomUUID(),
      word: "same",
    });
  const result = structuredClone(rooms.room(a).lastGame!.result);
  now = { mono: 100_000, wall: start.wall + 1_000_000 };
  stale();
  cancelled();
  early();
  assert.deepEqual(rooms.room(a).lastGame!.result, result);
  assert.equal(rooms.room(a).phase, "WAITING");
  rooms.leave(a);
  rooms.leave(b);
  stale();
  assert.equal(rooms.entries.size, 0);
});

test("waiting rooms start after the unready member leaves or expires", (t) => {
  for (const removal of ["leave", "expire"]) {
    let now = { ...start };
    const rooms = new Rooms(() => now);
    const sessions = new Sessions();
    const a = sessions.restore(undefined, now.mono);
    const b = sessions.restore(undefined, now.mono);
    const c = sessions.restore(undefined, now.mono);
    a.connectionId = "a";
    b.connectionId = "b";
    c.connectionId = "c";
    rooms.create(a, "A");
    rooms.join(b, a.roomCode!, "B");
    rooms.join(c, a.roomCode!, "C");
    t.after(() => rooms.close());
    rooms.ready(a, true);
    rooms.ready(b, true);
    assert.equal(rooms.room(a).phase, "WAITING");
    if (removal === "leave") rooms.leave(c);
    else {
      c.connectionId = null;
      rooms.disconnect(c);
      now = { mono: start.mono + 120_000, wall: start.wall + 120_000 };
      rooms.advance(rooms.room(a));
    }
    const room = rooms.room(a);
    assert.equal(room.phase, "COUNTDOWN");
    assert.equal(room.countdown, now.mono + 3000);
    assert.equal(room.members.size, 2);
    now = { mono: now.mono + 3000, wall: now.wall + 3000 };
    rooms.advance(room);
    assert.equal(room.phase, "PLAYING");
    assert.deepEqual(
      room.game!.players.map((player) => player.id),
      [a.id, b.id],
    );
  }
});

test("leaving during countdown cancels it even when two ready members remain", (t) => {
  const rooms = new Rooms(() => ({ ...start }));
  const sessions = new Sessions();
  const a = sessions.restore(undefined, start.mono);
  const b = sessions.restore(undefined, start.mono);
  const c = sessions.restore(undefined, start.mono);
  t.after(() => rooms.close());
  a.connectionId = "a";
  b.connectionId = "b";
  c.connectionId = "c";
  rooms.create(a, "A");
  rooms.join(b, a.roomCode!, "B");
  rooms.join(c, a.roomCode!, "C");
  for (const player of [a, b, c]) rooms.ready(player, true);
  assert.equal(rooms.room(a).phase, "COUNTDOWN");
  rooms.leave(c);
  assert.equal(rooms.room(a).phase, "WAITING");
  assert.equal(rooms.room(a).countdown, null);
  assert.equal(rooms.room(a).members.size, 2);
});
