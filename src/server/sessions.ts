import { randomBytes, randomUUID } from "node:crypto";

import { log } from "./log.js";

export type Session = {
  id: string;
  token: string;
  roomCode: string | null;
  connectionId: string | null;
  lastActive: number;
};
export class Sessions {
  readonly entries = new Map<string, Session>();
  get(token: string | undefined, now: number): Session | undefined {
    const session = token ? this.entries.get(token) : undefined;
    if (
      session &&
      !session.roomCode &&
      now - session.lastActive >= 86_400_000
    ) {
      this.entries.delete(session.token);
      log(`Session expired: ${session.id}`);
      return undefined;
    }
    return session;
  }
  restore(token: string | undefined, now: number): Session {
    let session = this.get(token, now);
    if (!session) {
      session = {
        id: randomUUID(),
        token: randomBytes(32).toString("base64url"),
        roomCode: null,
        connectionId: null,
        lastActive: now,
      };
      this.entries.set(session.token, session);
      log(`Session created: ${session.id}`);
    }
    session.lastActive = now;
    return session;
  }
  cleanup(now: number) {
    for (const token of this.entries.keys()) this.get(token, now);
  }
}
