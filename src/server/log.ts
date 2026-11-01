import { styleText } from "node:util";

export function log(
  message: string,
  roomCode?: string | null,
  level: "info" | "warn" | "error" = "info",
) {
  const stream = level === "info" ? process.stdout : process.stderr;
  const color = { info: "cyan", warn: "yellow", error: "red" } as const;
  const label = styleText(color[level], level.toUpperCase().padEnd(5), {
    stream,
  });
  console[level](
    `${new Date().toISOString()} ${label} [${roomCode ?? "server"}] ${message.replace(/\p{Cc}/gu, " ")}`,
  );
}
