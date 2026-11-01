import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import test from "node:test";

import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

import type { Ack, Snapshot } from "../shared/protocol.js";
import { createApp } from "./app.js";
import { Rooms } from "./rooms.js";

type Client = { socket: Socket; cookie: string; latest: Snapshot };
async function harness(t: TestContext) {
  let time = { mono: 1000, wall: 1_700_000_000_000 };
  const rooms = new Rooms(() => time);
  const service = await createApp({ rooms });
  await service.app.listen({ port: 0, host: "127.0.0.1" });
  const origin = service.app.listeningOrigin;
  const clients: Client[] = [];
  t.after(async () => {
    for (const client of clients) client.socket.disconnect();
    await service.app.close();
  });
  async function connect(existingCookie?: string): Promise<Client> {
    const response = await fetch(`${origin}/api/session`, {
      method: "POST",
      headers: {
        Origin: origin,
        ...(existingCookie ? { Cookie: existingCookie } : {}),
      },
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0]!;
    assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
    assert.match(response.headers.get("set-cookie")!, /SameSite=Strict/i);
    const socket = io(origin, {
      transports: ["websocket"],
      extraHeaders: { Origin: origin, Cookie: cookie },
      forceNew: true,
      autoConnect: false,
      reconnection: false,
    });
    const client = { socket, cookie, latest: null as unknown as Snapshot };
    socket.on("state:sync", (snapshot) => {
      client.latest = snapshot;
    });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      socket.once("state:sync", () => resolve());
      socket.once("connect_error", reject);
      socket.connect();
    });
    return client;
  }
  function advance(ms: number) {
    time = { mono: time.mono + ms, wall: time.wall + ms };
    for (const room of rooms.entries.values()) rooms.advance(room);
  }
  async function command(
    client: Client,
    event: string,
    payload: unknown = {},
  ): Promise<Ack> {
    return client.socket.timeout(2000).emitWithAck(event, payload);
  }
  async function state(client: Client) {
    await command(client, "state:sync");
    return client.latest;
  }
  async function disconnect(client: Client) {
    const serverSocket = service.io.sockets.sockets.get(client.socket.id!);
    if (!serverSocket) {
      client.socket.disconnect();
      return;
    }
    await new Promise<void>((resolve) => {
      serverSocket.once("disconnect", () => resolve());
      client.socket.disconnect();
    });
  }
  return {
    ...service,
    origin,
    clients,
    connect,
    advance,
    command,
    state,
    disconnect,
  };
}

test("lobby validates host configuration, names, countdown cancellation and host transfer", async (t) => {
  const h = await harness(t);
  const a = await h.connect();
  const b = await h.connect();
  const c = await h.connect();
  assert.equal(
    (await h.command(a, "room:create", { name: " Alice " })).ok,
    true,
  );
  const code = a.latest.room!.code;
  const invite = await fetch(`${h.origin}/api/rooms/${code}`, {
    headers: { Origin: h.origin },
  });
  assert.deepEqual(await invite.json(), { exists: true });
  assert.equal(
    (await h.command(b, "room:join", { code, name: "alice" })).ok,
    false,
  );
  assert.equal(
    (await h.command(b, "room:join", { code, name: "Bob" })).ok,
    true,
  );
  assert.equal(
    (await h.command(a, "room:create", { name: "Other" })).ok,
    false,
  );
  for (const name of ["x".repeat(21), "x\ny", " "])
    assert.equal((await h.command(a, "player:rename", { name })).ok, false);
  const min = { capacity: 2, maxRounds: 2, roundSeconds: 1 };
  assert.equal((await h.command(b, "room:configure", min)).ok, false);
  assert.equal((await h.command(a, "room:configure", min)).ok, true);
  await h.command(b, "player:ready", { ready: true });
  for (const config of [
    { ...min, maxRounds: 1 },
    { ...min, maxRounds: 1000 },
    { ...min, maxRounds: 2.5 },
    { ...min, roundSeconds: 0 },
    { ...min, roundSeconds: 601 },
    { ...min, roundSeconds: 1.5 },
    { ...min, capacity: 1 },
    { ...min, capacity: 100 },
    { ...min, capacity: 2.5 },
  ]) {
    assert.equal((await h.command(a, "room:configure", config)).ok, false);
    assert.deepEqual(a.latest.room!.config, min);
    assert.equal(
      a.latest.room!.members.find((member) => member.id === b.latest.playerId)!
        .ready,
      true,
    );
  }
  const max = { capacity: 99, maxRounds: 999, roundSeconds: 600 };
  assert.equal((await h.command(a, "room:configure", max)).ok, true);
  assert.equal(
    a.latest.room!.members.every((member) => !member.ready),
    true,
  );
  await h.command(c, "room:join", { code, name: "C" });
  assert.equal((await h.command(a, "room:configure", min)).ok, false);
  await h.command(a, "player:ready", { ready: true });
  await h.command(b, "player:ready", { ready: true });
  await h.command(c, "player:ready", { ready: true });
  assert.equal(c.latest.room!.phase, "COUNTDOWN");
  assert.equal(
    (await h.command(a, "player:rename", { name: "New" })).ok,
    false,
  );
  assert.equal((await h.command(a, "room:configure", max)).ok, false);
  await h.command(b, "player:ready", { ready: false });
  h.advance(3000);
  assert.equal((await h.state(a)).room!.phase, "WAITING");
  await h.command(b, "player:ready", { ready: true });
  await h.disconnect(b);
  assert.equal((await h.state(a)).room!.phase, "WAITING");
  const recoveredB = await h.connect(b.cookie);
  assert.equal(recoveredB.latest.playerId, b.latest.playerId);
  await h.command(recoveredB, "player:ready", { ready: true });
  h.advance(3000);
  assert.equal((await h.state(a)).room!.phase, "PLAYING");
  await h.command(a, "room:leave");
  assert.equal(
    (await h.state(recoveredB)).room!.hostId,
    recoveredB.latest.playerId,
  );
  assert.equal(recoveredB.latest.room!.phase, "PLAYING");
  assert.equal(
    recoveredB.latest.room!.game!.players.filter((player) => !player.forfeit)
      .length,
    2,
  );
});

test("99 real clients fit, the 100th is rejected, and the playing roster is locked", async (t) => {
  const h = await harness(t);
  const a = await h.connect();
  await h.command(a, "room:create", { name: "Player 0" });
  const code = a.latest.room!.code;
  await h.command(a, "room:configure", {
    capacity: 99,
    maxRounds: 999,
    roundSeconds: 600,
  });
  const members = [a];
  for (let index = 1; index <= 99; index++) {
    const client = await h.connect();
    const ack = await h.command(client, "room:join", {
      code,
      name: `Player ${index}`,
    });
    assert.equal(ack.ok, index < 99);
    if (index < 99) members.push(client);
  }
  assert.equal((await h.state(a)).room!.members.length, 99);
  for (const client of members)
    await h.command(client, "player:ready", { ready: true });
  h.advance(3000);
  assert.equal((await h.state(a)).room!.game!.players.length, 99);
  const outsider = h.clients.at(-1)!;
  assert.equal(
    (await h.command(outsider, "room:join", { code, name: "Late" })).ok,
    false,
  );
});
test("private answers survive reconnect and history is authorized, revealed-only and paginated", async (t) => {
  const h = await harness(t);
  const a = await h.connect();
  const b = await h.connect();
  const outsider = await h.connect();
  await h.command(a, "room:create", { name: "A" });
  const code = a.latest.room!.code;
  await h.command(b, "room:join", { code, name: "B" });
  await h.command(a, "room:configure", {
    capacity: 8,
    maxRounds: 30,
    roundSeconds: 600,
  });
  await h.command(a, "player:ready", { ready: true });
  await h.command(b, "player:ready", { ready: true });
  h.advance(3000);
  const initial = (await h.state(a)).room!.game!;
  const url = `${h.origin}/api/rooms/${code}/games/${initial.id}/rounds`;
  const headers = { Origin: h.origin, Cookie: b.cookie };
  const submission = {
    gameId: initial.id,
    round: 1,
    requestId: crypto.randomUUID(),
    word: "private-alpha",
  };
  assert.equal((await h.command(a, "game:submit", submission)).ok, true);
  assert.equal(
    JSON.stringify(await h.state(b)).includes("private-alpha"),
    false,
  );
  assert.equal(
    JSON.stringify(b.latest).includes(a.cookie.split("=")[1]!),
    false,
  );
  assert.deepEqual((await (await fetch(url, { headers })).json()).rounds, []);
  assert.equal(
    (
      await fetch(url, {
        headers: { Origin: h.origin, Cookie: outsider.cookie },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(url, {
        headers: { Origin: "https://unrelated.example", Cookie: b.cookie },
      })
    ).status,
    403,
  );
  a.socket.disconnect();
  const recovered = await h.connect(a.cookie);
  assert.equal(recovered.latest.playerId, a.latest.playerId);
  assert.equal(recovered.latest.room!.members.length, 2);
  assert.equal(recovered.latest.room!.game!.mine.answer, "private-alpha");
  assert.equal(recovered.latest.room!.game!.deadlineAt, initial.deadlineAt);
  await h.command(b, "game:submit", {
    ...submission,
    requestId: crypto.randomUUID(),
    word: "beta",
  });
  assert.equal((await h.state(b)).room!.game!.phase, "REVEALING");
  for (let round = 2; round <= 21; round++) {
    h.advance(5000);
    for (const [client, prefix] of [
      [recovered, "a"],
      [b, "b"],
    ] as const) {
      assert.equal(
        (
          await h.command(client, "game:submit", {
            gameId: initial.id,
            round,
            requestId: crypto.randomUUID(),
            word: `${prefix}-${round}`,
          })
        ).ok,
        true,
      );
    }
  }
  const first = await (await fetch(url, { headers })).json();
  assert.equal(first.rounds.length, 20);
  assert.equal(first.hasMore, true);
  const second = await (
    await fetch(`${url}?after=${first.nextAfter}`, { headers })
  ).json();
  assert.equal(second.rounds.length, 1);
  assert.equal(second.rounds[0].number, 21);
  assert.equal(second.hasMore, false);
  const snapshot = await h.state(b);
  assert.equal("history" in snapshot.room!.game!, false);
  assert.equal(snapshot.room!.game!.previousRound!.number, 21);
});
test("submission replay, timeout recovery and connection takeover preserve the authoritative game", async (t) => {
  const h = await harness(t);
  const a = await h.connect();
  const b = await h.connect();
  const c = await h.connect();
  await h.command(a, "room:create", { name: "A" });
  const code = a.latest.room!.code;
  for (const [client, name] of [
    [b, "B"],
    [c, "C"],
  ] as const)
    await h.command(client, "room:join", { code, name });
  await h.command(a, "room:configure", {
    capacity: 8,
    maxRounds: 2,
    roundSeconds: 1,
  });
  for (const client of [a, b, c])
    await h.command(client, "player:ready", { ready: true });
  h.advance(3000);
  const initial = (await h.state(a)).room!.game!;
  const request = {
    gameId: initial.id,
    round: 1,
    requestId: crypto.randomUUID(),
    word: "alpha",
  };
  const receipt = await h.command(a, "game:submit", request);
  assert.equal(receipt.ok, true);
  assert.equal(
    (
      await h.command(b, "game:submit", {
        ...request,
        playerId: a.latest.playerId,
      })
    ).ok,
    false,
  );
  assert.equal(
    (
      await h.command(b, "game:submit", {
        ...request,
        requestId: crypto.randomUUID(),
        word: "beta",
      })
    ).ok,
    true,
  );
  c.socket.disconnect();
  h.advance(1000);
  assert.equal((await h.state(b)).room!.game!.phase, "REVEALING");
  assert.deepEqual(await h.command(a, "game:submit", request), receipt);
  h.advance(5000);
  assert.equal(
    (
      await h.command(a, "game:submit", {
        ...request,
        requestId: crypto.randomUUID(),
      })
    ).ok,
    false,
  );
  const recoveredC = await h.connect(c.cookie);
  assert.equal(recoveredC.latest.playerId, c.latest.playerId);
  assert.equal(recoveredC.latest.room!.game!.mine.active, false);
  assert.equal(
    (
      await h.command(recoveredC, "game:submit", {
        ...request,
        round: 2,
        requestId: crypto.randomUUID(),
        word: "revive",
      })
    ).ok,
    false,
  );
  let replaced = false;
  a.socket.once("session:replaced", () => {
    replaced = true;
  });
  const takeover = await h.connect(a.cookie);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(replaced, true);
  assert.equal(a.socket.connected, false);
  assert.equal(takeover.latest.playerId, a.latest.playerId);
  assert.equal(takeover.latest.room!.members.length, 3);
  assert.equal(
    takeover.latest.room!.members.find(
      (member) => member.id === takeover.latest.playerId,
    )!.online,
    true,
  );
  assert.deepEqual(await h.command(takeover, "game:submit", request), receipt);
  for (const client of [takeover, b])
    assert.equal(
      (
        await h.command(client, "game:submit", {
          ...request,
          round: 2,
          requestId: crypto.randomUUID(),
          word: "together",
        })
      ).ok,
      true,
    );
  assert.equal((await h.state(b)).room!.result!.reason, "success");
  const result = structuredClone(b.latest.room!.result);
  assert.deepEqual(await h.command(takeover, "game:submit", request), receipt);
  assert.deepEqual((await h.state(b)).room!.result, result);
});

test("offline members, idle sessions, empty rooms and older game history are released", async (t) => {
  const h = await harness(t);
  const a = await h.connect();
  const b = await h.connect();
  const c = await h.connect();
  await h.command(a, "room:create", { name: "A" });
  const code = a.latest.room!.code;
  await h.command(b, "room:join", { code, name: "B" });
  await h.command(c, "room:join", { code, name: "C" });
  await h.command(a, "room:configure", {
    capacity: 8,
    maxRounds: 2,
    roundSeconds: 1,
  });
  let oldGame = "";
  for (let index = 0; index < 2; index++) {
    for (const client of [a, b, c])
      await h.command(client, "player:ready", { ready: true });
    h.advance(3000);
    const game = (await h.state(a)).room!.game!;
    if (index === 0) oldGame = game.id;
    else
      assert.equal(
        (
          await fetch(`${h.origin}/api/rooms/${code}/games/${oldGame}/rounds`, {
            headers: { Origin: h.origin, Cookie: a.cookie },
          })
        ).status,
        200,
      );
    for (const client of [a, b])
      await h.command(client, "game:submit", {
        gameId: game.id,
        round: 1,
        requestId: crypto.randomUUID(),
        word: "common",
      });
    if (index === 0)
      await h.command(c, "game:submit", {
        gameId: game.id,
        round: 1,
        requestId: crypto.randomUUID(),
        word: "COMMON",
      });
    else {
      await h.disconnect(c);
      h.advance(1000);
    }
  }
  assert.equal(
    (
      await fetch(`${h.origin}/api/rooms/${code}/games/${oldGame}/rounds`, {
        headers: { Origin: h.origin, Cookie: a.cookie },
      })
    ).status,
    403,
  );
  assert.equal((await h.state(a)).room!.result!.forfeitCount, 1);
  h.advance(119_999);
  assert.equal((await h.state(a)).room!.members.length, 3);
  h.advance(1);
  assert.equal((await h.state(a)).room!.members.length, 2);
  await h.disconnect(a);
  await h.disconnect(b);
  assert.equal(h.rooms.entries.get(code)!.hostId, null);
  const reconnected = await h.connect(b.cookie);
  assert.equal(reconnected.latest.room!.hostId, reconnected.latest.playerId);
  await h.disconnect(reconnected);
  h.advance(120_000);
  assert.equal(h.rooms.entries.size, 0);
  assert.equal(
    (
      await fetch(`${h.origin}/api/rooms/${code}`, {
        headers: { Origin: h.origin },
      })
    ).status,
    404,
  );
  assert.equal(
    [...h.sessions.entries.values()].every(
      (session) => session.roomCode === null,
    ),
    true,
  );
  h.advance(86_400_000);
  h.sessions.cleanup(h.rooms.now().mono);
  assert.equal(h.sessions.entries.size, 0);
});

test("cross-origin connections and unauthenticated sockets fail; production cookies are protected", async (t) => {
  const h = await harness(t);
  const client = await h.connect();
  for (const headers of [
    { Origin: "https://unrelated.example", Cookie: client.cookie },
    { Origin: h.origin },
  ]) {
    const socket = io(h.origin, {
      transports: ["websocket"],
      extraHeaders: headers,
      autoConnect: false,
      reconnection: false,
    });
    const error = await new Promise<Error>((resolve) => {
      socket.once("connect_error", resolve);
      socket.connect();
    });
    assert.ok(error);
    assert.equal(socket.connected, false);
    socket.disconnect();
  }
  const production = await createApp({ production: true });
  t.after(() => production.app.close());
  const response = await production.app.inject({
    method: "POST",
    url: "/api/session",
    headers: { host: "same-word.example", origin: "http://same-word.example" },
  });
  assert.match(response.headers["set-cookie"] as string, /Secure/);
  assert.match(response.headers["set-cookie"] as string, /HttpOnly/);
  assert.equal("token" in response.json(), false);
});
