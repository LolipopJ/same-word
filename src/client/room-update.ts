import type { Snapshot } from "../shared/protocol.js";

export type RoomUpdate = {
  snapshot: Snapshot;
  connection: number;
  baseline: boolean;
};
