import { BlockList, isIP } from "node:net";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { searchIndexability } from "./scripts/search-indexability.js";

function publicOrigin(value: string | undefined): string {
  const fail = () => {
    throw new Error(
      "PUBLIC_ORIGIN must be a real public HTTPS origin without credentials, a path, query, or fragment. Configure it in the repository .env before building.",
    );
  };
  if (!value) return fail();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail();
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
  const local = new BlockList();
  for (const [address, prefix] of [
    ["0.0.0.0", 8],
    ["10.0.0.0", 8],
    ["100.64.0.0", 10],
    ["127.0.0.0", 8],
    ["169.254.0.0", 16],
    ["172.16.0.0", 12],
    ["192.0.0.0", 24],
    ["192.0.2.0", 24],
    ["192.168.0.0", 16],
    ["198.18.0.0", 15],
    ["198.51.100.0", 24],
    ["203.0.113.0", 24],
    ["224.0.0.0", 3],
    ["::", 128],
    ["::1", 128],
    ["fc00::", 7],
    ["fe80::", 10],
    ["ff00::", 8],
    ["2001:db8::", 32],
  ] as const)
    local.addSubnet(address, prefix, isIP(address) === 6 ? "ipv6" : "ipv4");
  const ip = isIP(host);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.href.includes("?") ||
    url.href.includes("#") ||
    (ip
      ? local.check(host, ip === 6 ? "ipv6" : "ipv4")
      : !host.includes(".") ||
        /(^|\.)(localhost|local|internal|test|invalid|example|example\.(com|net|org))$/.test(
          host,
        ))
  )
    return fail();
  return url.origin;
}

export default defineConfig(({ command, mode }) => {
  const envDir = fileURLToPath(new URL(".", import.meta.url));
  const env = loadEnv(mode, envDir, "PUBLIC_ORIGIN");
  return {
    root: fileURLToPath(new URL("src/client", import.meta.url)),
    envDir,
    plugins: [
      react(),
      tailwindcss(),
      ...(command === "build"
        ? [searchIndexability(publicOrigin(env.PUBLIC_ORIGIN))]
        : []),
    ],
    build: { outDir: "../../dist/client", emptyOutDir: true },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": "http://127.0.0.1:3000",
        "/health": "http://127.0.0.1:3000",
        "/socket.io": { target: "http://127.0.0.1:3000", ws: true },
      },
    },
  };
});
