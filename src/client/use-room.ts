import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { io } from "socket.io-client";

import type {
  Ack,
  ClientToServerEvents,
  Command,
  Payload,
  ServerToClientEvents,
  Snapshot,
} from "../shared/protocol.js";
import { LocaleError } from "./i18n/locale.js";
import type { RoomUpdate } from "./room-update.js";

export function useRoom() {
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const [update, setUpdate] = useState<RoomUpdate | null>(null);
  const connectionGenerationRef = useRef(0);
  const latestSnapshotRef = useRef<Snapshot | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "online" | "offline" | "replaced"
  >("connecting");
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    let alive = true;
    let baseline = true;
    const connection = io({ autoConnect: false });
    socketRef.current = connection;
    async function initialize() {
      try {
        const response = await fetch("/api/session", { method: "POST" });
        if (!response.ok) throw new Error("session failed");
        if (alive) connection.connect();
      } catch {
        if (alive) setStatus("offline");
      }
    }
    connection.on("connect", () => {
      connectionGenerationRef.current += 1;
      baseline = true;
      setStatus("online");
      connection.emit("state:sync", {}, () => {});
    });
    connection.on("disconnect", () =>
      setStatus((current) => (current === "replaced" ? current : "offline")),
    );
    connection.on("connect_error", (error) => {
      setStatus("offline");
      if (error.message === "SESSION_REQUIRED") void initialize();
    });
    connection.on("session:replaced", () => {
      setStatus("replaced");
      connection.disconnect();
    });
    connection.on("state:sync", (next: Snapshot) => {
      const current = latestSnapshotRef.current;
      if (
        current?.room?.code === next.room?.code &&
        current?.room &&
        next.room &&
        current.room.version > next.room.version
      )
        return;
      latestSnapshotRef.current = next;
      setOffset(next.serverNow - Date.now());
      setUpdate({
        snapshot: next,
        connection: connectionGenerationRef.current,
        baseline,
      });
      baseline = false;
    });
    void initialize();
    return () => {
      alive = false;
      connection.disconnect();
      socketRef.current = null;
    };
  }, []);
  async function send<K extends Command>(
    event: K,
    payload: Payload<K>,
  ): Promise<Ack> {
    const connection = socketRef.current;
    if (!connection?.connected || status !== "online")
      throw new LocaleError("connectionLost");
    const attempts = event === "game:submit" ? 3 : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await (
          connection.timeout(2500).emitWithAck as (
            event: Command,
            payload: unknown,
          ) => Promise<Ack>
        )(event, payload);
      } catch {
        if (attempt === attempts - 1 || !connection.connected)
          throw new LocaleError("submitUnconfirmed");
      }
    }
    throw new LocaleError("submitUnconfirmed");
  }
  return { snapshot: update?.snapshot ?? null, update, status, send, offset };
}
