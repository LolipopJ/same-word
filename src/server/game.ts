import { randomUUID } from "node:crypto";

import type {
  Ack,
  Config,
  Forfeit,
  GameView,
  Payload,
  PlayerView,
  Result,
  RoundView,
  SubmissionReceipt,
} from "../shared/protocol.js";
import { normalizeText } from "../shared/words.js";
import { reject } from "./errors.js";
import type { Time } from "./rooms.js";

type Answer = { text: string; key: string; requestId: string };
type Round = {
  number: number;
  participantIds: string[];
  answers: Map<string, Answer>;
};
export type Game = {
  id: string;
  config: Config;
  players: PlayerView[];
  phase: "COLLECTING" | "REVEALING" | "FINISHED";
  round: Round;
  deadline: number;
  started: Time;
  history: RoundView[];
  historyKeys: Set<string>;
  receipts: Map<string, SubmissionReceipt>;
  result: Result | null;
};
export function createGame(
  players: { id: string; name: string }[],
  config: Config,
  now: Time,
): Game {
  return {
    id: randomUUID(),
    config: { ...config },
    players: players.map((player) => ({ ...player, score: 0, forfeit: null })),
    phase: "COLLECTING",
    round: {
      number: 1,
      participantIds: players.map((player) => player.id),
      answers: new Map(),
    },
    deadline: now.mono + config.roundSeconds * 1000,
    started: { ...now },
    history: [],
    historyKeys: new Set(),
    receipts: new Map(),
    result: null,
  };
}
export function replay(
  game: Game,
  id: string,
  input: Payload<"game:submit">,
): Ack | null {
  const receipt = game.receipts.get(`${id}:${input.requestId}`);
  if (!receipt) return null;
  if (input.gameId !== game.id || input.round !== receipt.round)
    reject("STALE_REQUEST", "请求已过期");
  return {
    ok: true,
    code: "OK",
    message: "已提交",
    submission: { ...receipt },
  };
}
export function submit(
  game: Game,
  id: string,
  input: Payload<"game:submit">,
  now: Time,
): Ack {
  const previous = replay(game, id, input);
  if (previous) return previous;
  if (input.gameId !== game.id || input.round !== game.round.number)
    reject("STALE_REQUEST", "请求已过期");
  advanceGame(game, now);
  if (game.phase !== "COLLECTING" || input.round !== game.round.number)
    reject("STALE_REQUEST", "作答已截止或轮次已结束");
  const player = game.players.find((player) => player.id === id);
  if (!player || player.forfeit)
    reject("FORFEITED", "你已弃权，不能在本局恢复参赛");
  if (game.round.answers.has(id))
    reject("ALREADY_SUBMITTED", "本轮已提交，无法更改");
  let word: ReturnType<typeof normalizeText>;
  try {
    word = normalizeText(input.word);
  } catch (error) {
    reject("INVALID_INPUT", `发送失败：${(error as Error).message}`);
  }
  if (game.historyKeys.has(word.key))
    reject("HISTORICAL_WORD", "发送失败：该词已在之前轮次出现");
  game.round.answers.set(id, { ...word, requestId: input.requestId });
  const receipt = {
    requestId: input.requestId,
    gameId: input.gameId,
    round: input.round,
    word: word.text,
  };
  game.receipts.set(`${id}:${input.requestId}`, receipt);
  settle(game, now);
  return {
    ok: true,
    code: "OK",
    message: "已提交",
    submission: { ...receipt },
  };
}
function settle(game: Game, now: Time) {
  if (game.phase !== "COLLECTING") return;
  const active = game.players.filter((player) => !player.forfeit);
  if (active.length < 2) {
    finish(game, "insufficient_players", now);
    return;
  }
  if (!active.every((player) => game.round.answers.has(player.id))) return;
  const grouped = new Map<string, string[]>();
  for (const player of active) {
    const key = game.round.answers.get(player.id)!.key;
    grouped.set(key, [...(grouped.get(key) ?? []), player.id]);
  }
  const success = grouped.size === 1;
  const groups = [...grouped.values()].map((playerIds) => ({
    playerIds,
    word: game.round.answers.get(playerIds[0]!)!.text,
    points: success ? 100 : playerIds.length >= 2 ? 1 : 0,
  }));
  for (const group of groups)
    for (const id of group.playerIds)
      game.players.find((player) => player.id === id)!.score += group.points;
  game.history.push(roundView(game, true, groups));
  for (const answer of game.round.answers.values())
    game.historyKeys.add(answer.key);
  game.phase = "REVEALING";
  game.deadline = now.mono + 5000;
  if (success) finish(game, "success", now, groups[0]!.word);
  else if (game.round.number >= game.config.maxRounds)
    finish(game, "round_limit", now);
}
function roundView(
  game: Game,
  completed: boolean,
  groups: RoundView["groups"] = [],
): RoundView {
  return {
    number: game.round.number,
    completed,
    groups,
    answers: game.round.participantIds.map((id) => ({
      id,
      name: game.players.find((player) => player.id === id)!.name,
      word: game.round.answers.get(id)?.text ?? null,
      forfeited: !!game.players.find((player) => player.id === id)!.forfeit,
      points: groups.find((group) => group.playerIds.includes(id))?.points ?? 0,
    })),
  };
}
function finish(
  game: Game,
  reason: Result["reason"],
  now: Time,
  commonWord: string | null = null,
) {
  if (game.phase === "FINISHED") return;
  if (game.phase === "COLLECTING") {
    game.history.push(roundView(game, false));
    for (const answer of game.round.answers.values())
      game.historyKeys.add(answer.key);
  }
  game.phase = "FINISHED";
  const finalCount = game.players.filter((player) => !player.forfeit).length;
  game.result = structuredClone({
    gameId: game.id,
    reason,
    commonWord,
    initialCount: game.players.length,
    finalCount,
    forfeitCount: game.players.length - finalCount,
    startedAt: game.started.wall,
    endedAt: now.wall,
    durationMs: now.mono - game.started.mono,
    roundsStarted: game.round.number,
    players: game.players,
    finalRound: game.history.at(-1)!,
  });
}
export function advanceGame(game: Game, now: Time) {
  if (game.phase === "FINISHED" || now.mono < game.deadline) return;
  if (game.phase === "COLLECTING") {
    for (const player of game.players) {
      if (!player.forfeit && !game.round.answers.has(player.id))
        player.forfeit = { reason: "timeout", round: game.round.number };
    }
    settle(game, now);
  } else {
    game.round = {
      number: game.round.number + 1,
      participantIds: game.players
        .filter((player) => !player.forfeit)
        .map((player) => player.id),
      answers: new Map(),
    };
    game.phase = "COLLECTING";
    game.deadline = now.mono + game.config.roundSeconds * 1000;
  }
}
export function gameView(game: Game, id: string, now: Time): GameView {
  if (game.phase === "FINISHED")
    throw new Error("Finished games use result projections");
  return {
    id: game.id,
    config: { ...game.config },
    round: game.round.number,
    phase: game.phase,
    deadlineAt: now.wall + game.deadline - now.mono,
    players: game.players.map((player) => ({
      ...player,
      forfeit: player.forfeit ? { ...player.forfeit } : null,
    })),
    submittedIds: [...game.round.answers.keys()],
    previousRound: game.history.at(-1) ?? null,
    mine: {
      active: game.players.some(
        (player) => player.id === id && !player.forfeit,
      ),
      answer: game.round.answers.get(id)?.text ?? null,
    },
  };
}
export function forfeit(
  game: Game,
  id: string,
  reason: Forfeit["reason"],
  now: Time,
) {
  advanceGame(game, now);
  if (game.phase === "FINISHED") reject("STALE_REQUEST", "本局已结束");
  const player = game.players.find((player) => player.id === id);
  if (!player || player.forfeit)
    reject("FORFEITED", "你已弃权，不能在本局恢复参赛");
  player.forfeit = { reason, round: game.round.number };
  if (game.players.filter((player) => !player.forfeit).length < 2)
    finish(game, "insufficient_players", now);
  else settle(game, now);
}
