import type { RoomUpdate } from "./room-update.js";

export type PresentationInput = {
  update: RoomUpdate | null;
  online: boolean;
  visible: boolean;
  reducedMotion: boolean;
  showResult: boolean;
};

export type Feedback = {
  id: string;
  owner: string;
  revealRound: number | null;
  success: boolean;
  newRound: boolean;
  result: boolean;
  readyIds: string[];
  submittedIds: string[];
  locked: boolean;
};

export type PresentationState = {
  input: PresentationInput;
  publicRound: number;
  successHandled: boolean;
  feedback: Feedback | null;
};

export function advancePresentation(
  previous: PresentationState | null,
  input: PresentationInput,
): PresentationState {
  const room = input.update?.snapshot.room;
  const before = previous?.input.update?.snapshot.room;
  const gameId = room?.game?.id ?? room?.result?.gameId;
  const previousGameId = before?.game?.id ?? before?.result?.gameId;
  const sameGame = room?.code === before?.code && gameId === previousGameId;
  const publicRound = room?.game
    ? room.game.previousRound
    : room?.result?.finalRound;
  const observedRound = Math.max(
    sameGame ? (previous?.publicRound ?? 0) : 0,
    publicRound?.number ?? 0,
  );
  const successHandled =
    (sameGame && !!previous?.successHandled) ||
    (!room?.game && room?.result?.reason === "success");
  const owner = `${room?.code}:${room?.game ? `${gameId}:${room.game.round}:${room.game.phase}` : input.showResult ? `${gameId}:result` : "lobby"}`;
  const baseline =
    !previous ||
    !room ||
    room.code !== before?.code ||
    input.update?.connection !== previous.input.update?.connection ||
    input.update?.baseline ||
    !input.online ||
    !input.visible ||
    input.reducedMotion ||
    !previous.input.online ||
    !previous.input.visible ||
    previous.input.reducedMotion;
  const state: PresentationState = {
    input,
    publicRound: observedRound,
    successHandled,
    feedback:
      !baseline && previous.feedback?.owner === owner
        ? previous.feedback
        : null,
  };
  if (
    baseline ||
    !input.update ||
    !room ||
    room.version <= (before?.version ?? -1)
  )
    return state;

  const readyIds = input.showResult
    ? []
    : room.members
        .filter(
          (member) =>
            member.online &&
            member.ready &&
            !before?.members.find((old) => old.id === member.id)?.ready,
        )
        .map((member) => member.id);
  const sameRound = sameGame && room.game?.round === before?.game?.round;
  const submittedIds =
    sameRound && room.game?.phase === "COLLECTING"
      ? room.game.submittedIds.filter(
          (id) => !before?.game?.submittedIds.includes(id),
        )
      : [];
  const locked =
    sameRound &&
    room.game?.phase === "COLLECTING" &&
    room.game.mine.answer !== null &&
    before?.game?.mine.answer === null;
  const success =
    input.showResult &&
    room.result?.reason === "success" &&
    !(sameGame && previous.successHandled);
  const revealRound =
    !success &&
    publicRound?.completed &&
    (room.game?.phase === "REVEALING" || (!room.game && input.showResult)) &&
    publicRound.number > (sameGame ? previous.publicRound : 0)
      ? publicRound.number
      : null;
  const newRound =
    room.game?.phase === "COLLECTING" &&
    (!sameRound || before?.game?.phase !== "COLLECTING");
  const result =
    input.showResult && !room.game && (before?.game !== null || !sameGame);
  if (
    success ||
    revealRound !== null ||
    newRound ||
    result ||
    readyIds.length ||
    submittedIds.length ||
    locked
  ) {
    state.feedback = {
      id: `${input.update.connection}:${room.version}`,
      owner,
      revealRound,
      success,
      newRound,
      result,
      readyIds,
      submittedIds,
      locked,
    };
  }
  return state;
}
