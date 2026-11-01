import { createApp } from "./app.js";
import { log } from "./log.js";

const production =
  process.env.NODE_ENV === "production" ||
  import.meta.url.endsWith("/dist/server/index.js");
const publicOrigin =
  process.env.PUBLIC_ORIGIN ??
  (production ? undefined : "http://127.0.0.1:5173");
const { app } = await createApp({ production, publicOrigin });
try {
  await app.listen({
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? "127.0.0.1",
  });
  log(`Same word listening on ${app.listeningOrigin}`);
} catch (error) {
  log(
    `Startup failed: ${error instanceof Error ? error.message : String(error)}`,
    null,
    "error",
  );
  await app.close();
  process.exitCode = 1;
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    log(`Shutting down: ${signal}`);
    void app.close();
  });
}
