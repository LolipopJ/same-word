import { createApp } from "./app.js";

const production =
  process.env.NODE_ENV === "production" ||
  import.meta.url.endsWith("/dist/server/index.js");
const publicOrigin =
  process.env.PUBLIC_ORIGIN ??
  (production ? undefined : "http://127.0.0.1:5173");
const { app } = await createApp({ production, publicOrigin });
await app.listen({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "127.0.0.1",
});
console.log(
  `Same word listening on ${app.server.address() && app.listeningOrigin}`,
);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close();
  });
}
