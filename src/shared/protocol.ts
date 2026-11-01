import { z } from "zod";

export const configSchema = z.strictObject({
  capacity: z.number().int().min(2).max(99),
  maxRounds: z.number().int().min(2).max(999),
  roundSeconds: z.number().int().min(1).max(600),
});
export type Config = z.infer<typeof configSchema>;
export const defaultConfig: Config = {
  capacity: 8,
  maxRounds: 20,
  roundSeconds: 60,
};
const gameRef = { gameId: z.uuid(), round: z.number().int().min(1).max(999) };
export const commands = {
  "room:create": z.strictObject({ name: z.string() }),
  "room:join": z.strictObject({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z2-9]{6}$/),
    name: z.string(),
  }),
  "room:leave": z.strictObject({}),
  "room:configure": configSchema,
  "player:rename": z.strictObject({ name: z.string() }),
  "player:ready": z.strictObject({ ready: z.boolean() }),
  "game:submit": z.strictObject({
    ...gameRef,
    requestId: z.uuid(),
    word: z.string(),
  }),
  "game:forfeit": z.strictObject(gameRef),
  "state:sync": z.strictObject({}),
};
export type Command = keyof typeof commands;
export type Payload<K extends Command> = z.infer<(typeof commands)[K]>;
export type ErrorCode =
  | "INVALID_INPUT"
  | "SESSION_REQUIRED"
  | "TAKEN_OVER"
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "ALREADY_IN_ROOM"
  | "NOT_MEMBER"
  | "NOT_HOST"
  | "WRONG_PHASE"
  | "NAME_TAKEN"
  | "STALE_REQUEST"
  | "FORFEITED"
  | "ALREADY_SUBMITTED"
  | "HISTORICAL_WORD";
export type Ack =
  | {
      ok: true;
      code: "OK";
      message: string;
      roomCode?: string;
      submission?: SubmissionReceipt;
    }
  | { ok: false; code: ErrorCode; message: string };
export type SubmissionReceipt = {
  requestId: string;
  gameId: string;
  round: number;
  word: string;
};
export type Forfeit = {
  reason: "left" | "voluntary" | "timeout";
  round: number;
};
export type PlayerView = {
  id: string;
  name: string;
  score: number;
  forfeit: Forfeit | null;
};
export type AnswerView = {
  id: string;
  name: string;
  word: string | null;
  forfeited: boolean;
  points: number;
};
export type RoundView = {
  number: number;
  completed: boolean;
  answers: AnswerView[];
  groups: { word: string; playerIds: string[]; points: number }[];
};
export type Result = {
  gameId: string;
  reason: "success" | "round_limit" | "insufficient_players";
  commonWord: string | null;
  initialCount: number;
  finalCount: number;
  forfeitCount: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  roundsStarted: number;
  players: PlayerView[];
  finalRound: RoundView;
};
export type GameView = {
  id: string;
  config: Config;
  round: number;
  phase: "COLLECTING" | "REVEALING";
  deadlineAt: number;
  players: PlayerView[];
  submittedIds: string[];
  previousRound: RoundView | null;
  mine: { active: boolean; answer: string | null };
};
export type RoomView = {
  code: string;
  version: number;
  hostId: string | null;
  phase: "WAITING" | "COUNTDOWN" | "PLAYING";
  config: Config;
  countdownAt: number | null;
  members: { id: string; name: string; online: boolean; ready: boolean }[];
  game: GameView | null;
  result: Result | null;
};
export type Snapshot = {
  playerId: string;
  serverNow: number;
  room: RoomView | null;
};
export type HistoryPage = {
  rounds: RoundView[];
  nextAfter: number;
  hasMore: boolean;
};
export type ClientToServerEvents = {
  [K in Command]: (
    payload: Payload<K>,
    acknowledge: (ack: Ack) => void,
  ) => void;
};
export type ServerToClientEvents = {
  "state:sync": (snapshot: Snapshot) => void;
  "session:replaced": () => void;
};
