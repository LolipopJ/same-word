import type { Ack, ErrorCode } from "../shared/protocol.js";

export class CommandError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export function reject(code: ErrorCode, message: string): never {
  throw new CommandError(code, message);
}
export function errorAck(error: unknown): Ack {
  if (error instanceof CommandError)
    return { ok: false, code: error.code, message: error.message };
  throw error;
}
export const accepted = {
  ok: true,
  code: "OK",
  message: "完成",
} as const satisfies Ack;
