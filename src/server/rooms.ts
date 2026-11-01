import { randomInt } from "node:crypto";

import type {
  Ack,
  Config,
  HistoryPage,
  Payload,
  RoomView,
  Snapshot,
} from "../shared/protocol.js";
import { defaultConfig } from "../shared/protocol.js";
import { normalizeText } from "../shared/words.js";
import { accepted, reject } from "./errors.js";
import type { Game } from "./game.js";
import {
  advanceGame,
  createGame,
  forfeit,
  gameView,
  replay,
  submit,
} from "./game.js";
import { log } from "./log.js";
import type { Session } from "./sessions.js";

export type Time = { mono: number; wall: number };
type Member = {
  session: Session;
  name: string;
  ready: boolean;
  offlineAt: number | null;
};
export type Room = {
  code: string;
  version: number;
  hostId: string | null;
  config: Config;
  phase: RoomView["phase"];
  members: Map<string, Member>;
  countdown: number | null;
  game?: Game;
  lastGame?: Game;
  timer?: ReturnType<typeof setTimeout>;
};
export class Rooms {
  readonly entries = new Map<string, Room>();
  onChange: (room: Room) => void = () => {};
  constructor(
    readonly now: () => Time = () => ({
      mono: performance.now(),
      wall: Date.now(),
    }),
  ) {}
  room(session: Session): Room {
    const room = session.roomCode
      ? this.entries.get(session.roomCode)
      : undefined;
    if (!room || !room.members.has(session.id))
      reject("NOT_MEMBER", "请先加入房间");
    return room;
  }
  create(session: Session, name: string): Ack {
    if (session.roomCode) reject("ALREADY_IN_ROOM", "请先离开当前房间");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code: string;
    do {
      code = Array.from(
        { length: 6 },
        () => alphabet[randomInt(alphabet.length)],
      ).join("");
    } while (this.entries.has(code));
    const room: Room = {
      code,
      version: 0,
      hostId: session.id,
      config: { ...defaultConfig },
      phase: "WAITING",
      members: new Map(),
      countdown: null,
    };
    this.add(room, session, name);
    this.entries.set(code, room);
    log(`Room created by ${room.members.get(session.id)!.name}`, code);
    this.changed(room);
    return { ...accepted, roomCode: code };
  }
  join(session: Session, code: string, name: string): Ack {
    if (session.roomCode) reject("ALREADY_IN_ROOM", "请先离开当前房间");
    const room = this.entries.get(code);
    if (!room) reject("ROOM_NOT_FOUND", "房间不存在或已失效，请重新创建或加入");
    this.advance(room);
    if (this.entries.get(code) !== room)
      reject("ROOM_NOT_FOUND", "房间不存在或已失效，请重新创建或加入");
    if (room.phase !== "WAITING")
      reject("WRONG_PHASE", "对局已开始或正在倒数，请稍后加入");
    if (room.members.size >= room.config.capacity)
      reject("ROOM_FULL", "房间已满");
    this.add(room, session, name);
    log(
      `${room.members.get(session.id)!.name} joined (${room.members.size}/${room.config.capacity})`,
      code,
    );
    this.changed(room);
    return { ...accepted, roomCode: code };
  }
  private add(room: Room, session: Session, raw: string) {
    const name = this.name(room, session.id, raw);
    room.members.set(session.id, {
      session,
      name,
      ready: false,
      offlineAt: null,
    });
    session.roomCode = room.code;
    this.transferHost(room);
  }
  private name(room: Room, id: string, raw: string) {
    let name: string;
    try {
      name = normalizeText(raw).text;
    } catch (error) {
      reject("INVALID_INPUT", `展示 ID：${(error as Error).message}`);
    }
    if (
      [...room.members.values()].some(
        (member) =>
          member.session.id !== id &&
          member.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      reject("NAME_TAKEN", "该展示 ID 已被使用");
    }
    return name;
  }
  rename(session: Session, raw: string): Ack {
    const room = this.room(session);
    this.advance(room);
    if (room.phase !== "WAITING") reject("WRONG_PHASE", "只能在准备阶段改名");
    const name = this.name(room, session.id, raw);
    const member = room.members.get(session.id)!;
    log(`${member.name} renamed to ${name}`, room.code);
    member.name = name;
    member.ready = false;
    this.changed(room);
    return accepted;
  }
  ready(session: Session, ready: boolean): Ack {
    const room = this.room(session);
    this.advance(room);
    if (room.phase === "PLAYING") reject("WRONG_PHASE", "对局进行中");
    room.members.get(session.id)!.ready = ready;
    log(
      `${room.members.get(session.id)!.name} ${ready ? "ready" : "not ready"}`,
      room.code,
    );
    if (!ready && room.phase === "COUNTDOWN") this.cancelCountdown(room);
    else this.startCountdownIfReady(room);
    this.changed(room);
    return accepted;
  }
  configure(session: Session, config: Config): Ack {
    const room = this.room(session);
    this.advance(room);
    if (room.phase !== "WAITING")
      reject("WRONG_PHASE", "只能在准备阶段修改配置");
    if (room.hostId !== session.id) reject("NOT_HOST", "仅房主可以修改配置");
    if (config.capacity < room.members.size)
      reject("INVALID_INPUT", "容量不能低于当前成员人数");
    room.config = { ...config };
    log(
      `Settings updated: capacity=${config.capacity}, rounds=${config.maxRounds}, time=${config.roundSeconds}s`,
      room.code,
    );
    for (const member of room.members.values()) member.ready = false;
    this.changed(room);
    return accepted;
  }
  forfeit(session: Session, input: Payload<"game:forfeit">): Ack {
    const room = this.room(session);
    const now = this.now();
    this.advance(room, now);
    if (
      !room.game ||
      room.game.id !== input.gameId ||
      room.game.round.number !== input.round
    )
      reject("STALE_REQUEST", "请求已过期");
    forfeit(room.game, session.id, "voluntary", now);
    log(
      `${room.members.get(session.id)!.name} forfeited round ${input.round}`,
      room.code,
    );
    this.finishIfNeeded(room);
    this.changed(room);
    return accepted;
  }
  submit(session: Session, input: Payload<"game:submit">): Ack {
    const room = this.room(session);
    const existing =
      room.game?.id === input.gameId
        ? room.game
        : room.lastGame?.id === input.gameId
          ? room.lastGame
          : undefined;
    const previous = existing ? replay(existing, session.id, input) : null;
    if (previous) return previous;
    const now = this.now();
    this.advance(room, now);
    if (!room.game) reject("STALE_REQUEST", "本局已结束");
    const ack = submit(room.game, session.id, input, now);
    log(
      `${room.members.get(session.id)!.name} submitted round ${input.round}`,
      room.code,
    );
    this.finishIfNeeded(room);
    this.changed(room);
    return ack;
  }
  history(
    session: Session,
    code: string,
    gameId: string,
    after: number,
  ): HistoryPage {
    const room = this.room(session);
    if (room.code !== code) reject("NOT_MEMBER", "只有本房间成员可以查看历史");
    this.advance(room);
    const game =
      room.game?.id === gameId
        ? room.game
        : room.lastGame?.id === gameId
          ? room.lastGame
          : undefined;
    if (!game) reject("STALE_REQUEST", "该局历史已释放或不存在");
    const rounds = game.history
      .filter((round) => round.number > after)
      .slice(0, 20);
    const nextAfter = rounds.at(-1)?.number ?? after;
    return {
      rounds,
      nextAfter,
      hasMore: game.history.some((round) => round.number > nextAfter),
    };
  }
  leave(session: Session): Ack {
    const room = this.room(session);
    const name = room.members.get(session.id)!.name;
    const now = this.now();
    this.advance(room, now);
    if (
      room.game?.players.some(
        (player) => player.id === session.id && !player.forfeit,
      )
    ) {
      forfeit(room.game, session.id, "left", now);
      this.finishIfNeeded(room);
    }
    room.members.delete(session.id);
    log(
      `${name} left (${room.members.size}/${room.config.capacity})`,
      room.code,
    );
    session.roomCode = null;
    session.lastActive = this.now().mono;
    if (room.phase === "COUNTDOWN") this.cancelCountdown(room);
    else this.startCountdownIfReady(room, now);
    this.transferHost(room);
    this.changed(room);
    return accepted;
  }
  connect(session: Session) {
    if (!session.roomCode) return;
    const room = this.room(session);
    this.advance(room);
    const member = room.members.get(session.id);
    if (!member) return;
    member.offlineAt = null;
    log(`${member.name} reconnected`, room.code);
    this.transferHost(room);
    this.changed(room);
  }
  disconnect(session: Session) {
    if (!session.roomCode) return;
    const room = this.room(session);
    this.advance(room);
    const member = room.members.get(session.id);
    if (!member) return;
    member.ready = false;
    member.offlineAt = this.now().mono;
    log(`${member.name} disconnected`, room.code);
    if (room.phase === "COUNTDOWN") this.cancelCountdown(room);
    this.transferHost(room);
    this.changed(room);
  }
  transferHost(room: Room) {
    if (room.hostId && room.members.get(room.hostId)?.session.connectionId)
      return;
    const previousHost = room.hostId;
    room.hostId =
      [...room.members.values()].find((member) => member.session.connectionId)
        ?.session.id ?? null;
    if (room.hostId !== previousHost)
      log(
        `Host changed: ${room.hostId ? room.members.get(room.hostId)!.name : "no online members"}`,
        room.code,
      );
  }
  advance(room: Room, now = this.now()) {
    if (this.entries.get(room.code) !== room) return;
    if (room.phase === "WAITING") {
      let removed = false;
      for (const [id, member] of room.members) {
        if (
          member.offlineAt !== null &&
          now.mono >= member.offlineAt + 120_000
        ) {
          member.session.roomCode = null;
          member.session.lastActive = now.mono;
          room.members.delete(id);
          log(`${member.name} removed after 120s offline`, room.code);
          removed = true;
        }
      }
      if (removed) {
        this.transferHost(room);
        this.startCountdownIfReady(room, now);
        this.changed(room);
      }
      if (room.members.size === 0) return;
    }
    if (
      room.phase === "COUNTDOWN" &&
      room.countdown !== null &&
      now.mono >= room.countdown
    ) {
      room.phase = "PLAYING";
      room.countdown = null;
      room.game = createGame(
        [...room.members.values()].map((member) => ({
          id: member.session.id,
          name: member.name,
        })),
        room.config,
        now,
      );
      log(`Game started: ${room.members.size} players, round 1`, room.code);
      this.changed(room);
    }
    if (room.game && now.mono >= room.game.deadline) {
      const round = room.game.round.number;
      if (room.game.phase === "COLLECTING") {
        const missing = room.game.players.filter(
          (player) =>
            !player.forfeit && !room.game!.round.answers.has(player.id),
        );
        log(
          `Round ${round} timed out: ${missing.map((player) => player.name).join(", ")}`,
          room.code,
          "warn",
        );
      }
      advanceGame(room.game, now);
      if (room.game.round.number !== round)
        log(`Round ${room.game.round.number} started`, room.code);
      this.finishIfNeeded(room);
      this.changed(room);
    }
  }
  private finishIfNeeded(room: Room) {
    if (room.game?.phase !== "FINISHED") return;
    const result = room.game.result!;
    log(
      `Game finished: ${result.reason}, rounds=${result.roundsStarted}, players=${result.finalCount}/${result.initialCount}, duration=${Math.round(result.durationMs / 1000)}s`,
      room.code,
    );
    room.lastGame = room.game;
    room.game = undefined;
    room.phase = "WAITING";
    for (const member of room.members.values()) {
      member.ready = false;
      if (!member.session.connectionId) member.offlineAt = this.now().mono;
    }
  }
  private startCountdownIfReady(room: Room, now = this.now()) {
    if (
      room.phase === "WAITING" &&
      room.members.size >= 2 &&
      [...room.members.values()].every(
        (member) => member.ready && member.session.connectionId,
      )
    ) {
      room.phase = "COUNTDOWN";
      room.countdown = now.mono + 3000;
      log("Countdown started: 3s", room.code);
    }
  }
  private cancelCountdown(room: Room) {
    log("Countdown cancelled", room.code);
    room.phase = "WAITING";
    room.countdown = null;
  }
  changed(room: Room) {
    clearTimeout(room.timer);
    room.version++;
    if (room.members.size === 0) {
      this.entries.delete(room.code);
      log("Room destroyed: no members", room.code);
      return;
    }
    const deadlines = [
      room.countdown,
      room.game?.deadline,
      ...(room.phase === "WAITING"
        ? [...room.members.values()]
            .filter((member) => member.offlineAt !== null)
            .map((member) => member.offlineAt! + 120_000)
        : []),
    ].filter((value): value is number => value !== undefined && value !== null);
    if (deadlines.length) {
      const deadline = Math.min(...deadlines);
      const expectedVersion = room.version;
      room.timer = setTimeout(
        () => {
          if (
            this.entries.get(room.code) !== room ||
            room.version !== expectedVersion
          )
            return;
          this.advance(room);
          if (room.version === expectedVersion) this.changed(room);
        },
        Math.max(1, deadline - this.now().mono),
      );
      room.timer.unref();
    }
    this.onChange(room);
  }
  snapshot(session: Session): Snapshot {
    const now = this.now();
    const room = session.roomCode
      ? this.entries.get(session.roomCode)
      : undefined;
    return {
      playerId: session.id,
      serverNow: now.wall,
      room: room
        ? {
            code: room.code,
            version: room.version,
            hostId: room.hostId,
            phase: room.phase,
            config: { ...room.config },
            countdownAt:
              room.countdown === null
                ? null
                : now.wall + room.countdown - now.mono,
            members: [...room.members.values()].map((member) => ({
              id: member.session.id,
              name: member.name,
              ready: member.ready,
              online: member.session.connectionId !== null,
            })),
            game: room.game ? gameView(room.game, session.id, now) : null,
            result: room.lastGame?.result ?? null,
          }
        : null,
    };
  }
  close() {
    for (const room of this.entries.values()) clearTimeout(room.timer);
    this.entries.clear();
  }
}
