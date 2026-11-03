import { fileURLToPath } from "node:url";

import cookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { Server } from "socket.io";
import { z } from "zod";

import type {
  Ack,
  ClientToServerEvents,
  Payload,
  ServerToClientEvents,
} from "../shared/protocol.js";
import { commands } from "../shared/protocol.js";
import { accepted, CommandError, errorAck } from "./errors.js";
import { log } from "./log.js";
import { Rooms } from "./rooms.js";
import { Sessions } from "./sessions.js";

export async function createApp({
  production = false,
  rooms = new Rooms(),
  publicOrigin = process.env.PUBLIC_ORIGIN,
} = {}) {
  const app = Fastify({ logger: false });
  const sessions = new Sessions();
  app.addHook("onError", (request, _reply, error, done) => {
    const code = (request.params as { code?: string } | undefined)?.code;
    log(
      `HTTP ${request.method} ${request.routeOptions.url}: ${error.message}`,
      code && /^[A-Z2-9]{6}$/.test(code) ? code : null,
      "error",
    );
    done();
  });
  await app.register(cookie);
  function sameOrigin(headers: {
    origin?: string;
    host?: string;
    "sec-fetch-site"?: string;
  }) {
    // Same-origin polling GETs can omit Origin; Fetch Metadata is browser-controlled.
    if (!headers.origin) return headers["sec-fetch-site"] === "same-origin";
    return headers.origin === (publicOrigin ?? `http://${headers.host}`);
  }
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(
    app.server,
    {
      maxHttpBufferSize: 16_384,
      allowRequest: (request, callback) => {
        const allowed = sameOrigin(request.headers);
        if (!allowed)
          log("Socket connection rejected: cross-origin request", null, "warn");
        callback(null, allowed);
      },
    },
  );
  // Prepend after Socket.IO attaches so its polling, client files and errors are covered too.
  app.server.prependListener("request", (request, response) => {
    if (request.url?.split("?")[0] !== "/")
      response.setHeader("X-Robots-Tag", "noindex");
  });
  app.post("/api/session", (request, reply) => {
    if (!sameOrigin(request.headers)) {
      log("Session request rejected: cross-origin request", null, "warn");
      return reply
        .code(403)
        .send({ code: "SESSION_REQUIRED", message: "仅允许同源访问" });
    }
    const session = sessions.restore(request.cookies.session, rooms.now().mono);
    reply.header("Cache-Control", "no-store");
    reply.setCookie("session", session.token, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      path: "/",
    });
    return { playerId: session.id, roomCode: session.roomCode };
  });
  io.use((socket, next) => {
    const session = sessions.get(
      app.parseCookie(socket.request.headers.cookie ?? "").session,
      rooms.now().mono,
    );
    if (!session) {
      log("Socket connection rejected: session required", null, "warn");
      return next(new Error("SESSION_REQUIRED"));
    }
    socket.data.session = session;
    next();
  });
  rooms.onChange = (room) => {
    for (const member of room.members.values()) {
      if (member.session.connectionId)
        io.to(member.session.connectionId).emit(
          "state:sync",
          rooms.snapshot(member.session),
        );
    }
  };
  io.on("connection", (socket) => {
    const session = socket.data.session as import("./sessions.js").Session;
    const oldId = session.connectionId;
    session.connectionId = socket.id;
    session.lastActive = rooms.now().mono;
    if (oldId) {
      log(
        `Session taken over by another connection: ${session.id}`,
        session.roomCode,
      );
      io.to(oldId).emit("session:replaced");
      io.sockets.sockets.get(oldId)?.disconnect(true);
    }
    rooms.connect(session);
    if (!session.roomCode) log(`Player connected: ${session.id}`);
    socket.emit("state:sync", rooms.snapshot(session));
    for (const event of Object.keys(commands) as (keyof typeof commands)[]) {
      socket.on(event, ((raw: unknown, acknowledge?: (ack: Ack) => void) => {
        if (typeof acknowledge !== "function") return;
        if (
          session.connectionId !== socket.id ||
          !sessions.entries.has(session.token)
        ) {
          log(
            `${event} rejected: TAKEN_OVER (player=${session.id})`,
            session.roomCode,
            "warn",
          );
          return acknowledge({
            ok: false,
            code: "TAKEN_OVER",
            message: "当前连接已失效，请刷新页面",
          });
        }
        const parsed = commands[event].safeParse(raw);
        const roomCode =
          session.roomCode ??
          (parsed.success && "code" in parsed.data ? parsed.data.code : null);
        if (!parsed.success) {
          log(
            `${event} rejected: INVALID_INPUT (player=${session.id})`,
            roomCode,
            "warn",
          );
          return acknowledge({
            ok: false,
            code: "INVALID_INPUT",
            message:
              event === "room:configure"
                ? "配置无效：容量 2～99、最多轮数 2～999、每轮时限 1～600 秒，均须为整数"
                : "输入格式无效，请检查后重试",
          });
        }
        session.lastActive = rooms.now().mono;
        try {
          let ack: Ack = accepted;
          const data = parsed.data;
          if (event === "room:create" && "name" in data)
            ack = rooms.create(session, data.name);
          else if (event === "room:join" && "code" in data && "name" in data)
            ack = rooms.join(session, data.code, data.name);
          else if (event === "room:leave") ack = rooms.leave(session);
          else if (event === "room:configure")
            ack = rooms.configure(session, data as Payload<"room:configure">);
          else if (event === "player:rename" && "name" in data)
            ack = rooms.rename(session, data.name);
          else if (event === "player:ready" && "ready" in data)
            ack = rooms.ready(session, data.ready);
          else if (event === "game:submit")
            ack = rooms.submit(session, data as Payload<"game:submit">);
          else if (event === "game:forfeit")
            ack = rooms.forfeit(session, data as Payload<"game:forfeit">);
          else if (event === "state:sync" && session.roomCode)
            rooms.advance(rooms.room(session));
          socket.emit("state:sync", rooms.snapshot(session));
          acknowledge(ack);
        } catch (error) {
          const expected = error instanceof CommandError;
          const reason = expected
            ? error.code
            : error instanceof Error
              ? error.message
              : String(error);
          log(
            `${event} ${expected ? "rejected" : "failed"}: ${reason} (player=${session.id})`,
            roomCode,
            expected ? "warn" : "error",
          );
          acknowledge(errorAck(error));
        }
      }) as never);
    }
    socket.on("disconnect", (reason) => {
      if (session.connectionId !== socket.id) return;
      session.connectionId = null;
      rooms.disconnect(session);
      if (!session.roomCode)
        log(`Player disconnected: ${session.id} (${reason})`);
    });
  });
  app.get("/health", () => ({ ok: true }));
  app.get("/api/rooms/:code", (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!sameOrigin(request.headers))
      return reply.code(403).send({ message: "仅允许同源访问" });
    const params = z
      .strictObject({ code: z.string().regex(/^[A-Z2-9]{6}$/) })
      .safeParse(request.params);
    const room = params.success
      ? rooms.entries.get(params.data.code)
      : undefined;
    if (room) rooms.advance(room);
    if (!room || !rooms.entries.has(room.code))
      return reply.code(404).send({ message: "房间不存在或已失效" });
    return { exists: true };
  });
  app.get("/api/rooms/:code/games/:gameId/rounds", (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (!sameOrigin(request.headers))
      return reply
        .code(403)
        .send({ code: "SESSION_REQUIRED", message: "仅允许同源访问" });
    const session = sessions.get(request.cookies.session, rooms.now().mono);
    if (!session)
      return reply
        .code(401)
        .send({ code: "SESSION_REQUIRED", message: "请先建立会话" });
    const params = z
      .strictObject({
        code: z.string().regex(/^[A-Z2-9]{6}$/),
        gameId: z.uuid(),
      })
      .safeParse(request.params);
    const query = z
      .strictObject({
        after: z.coerce.number().int().min(0).max(999).default(0),
      })
      .safeParse(request.query);
    if (!params.success || !query.success)
      return reply
        .code(400)
        .send({ code: "INVALID_INPUT", message: "历史查询参数无效" });
    session.lastActive = rooms.now().mono;
    try {
      return rooms.history(
        session,
        params.data.code,
        params.data.gameId,
        query.data.after,
      );
    } catch (error) {
      return reply.code(403).send(errorAck(error));
    }
  });
  if (production) {
    await app.register(fastifyStatic, {
      root: fileURLToPath(new URL("../../dist/client/", import.meta.url)),
      wildcard: false,
      globIgnore: ["index.html"],
    });
    app.get("/", (_, reply) => reply.sendFile("index.html"));
    app.get("/index.html", (_, reply) => reply.redirect("/", 301));
    app.get("/rooms/:code", (request, reply) => {
      const { code } = request.params as { code: string };
      return /^[A-Z2-9]{6}$/.test(code)
        ? reply.sendFile("index.html")
        : reply.callNotFound();
    });
  }
  const cleanup = setInterval(() => sessions.cleanup(rooms.now().mono), 60_000);
  cleanup.unref();
  app.addHook("onClose", async () => {
    log(
      `Server closing: ${rooms.entries.size} rooms, ${sessions.entries.size} sessions`,
    );
    clearInterval(cleanup);
    io.disconnectSockets(true);
    rooms.close();
    await io.close();
    log("Server stopped");
  });
  return { app, io, rooms, sessions };
}
