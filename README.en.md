![Same word / 同词相遇 — Different minds. One word.](./docs/assets/readme-banner.png)

[中文](./README.md) | English

# Same word · 同词相遇

An anonymous, browser-based multiplayer word association game. No account needed — create a room,
send the link to friends, and play. The server keeps the clock, hides answers until reveal,
and decides the score.

- Frontend: React + Vite + Tailwind CSS + daisyUI
- Backend: Fastify + Socket.IO, in-memory state, single process
- Shared: Zod-validated commands and the public protocol

## How to play

1. Pick a display ID. One player creates a room; the others join with the 6-character room code or the invite link.
2. Once everyone is online and ready, a 3-second countdown starts the game. Defaults: 8 players, 20 rounds, 60 seconds per round.
3. In round 1 everyone writes any word. From round 2 on, read every answer from the previous round and write a word that connects them all.
4. Everyone landing on the same word is a success: +100 points each. Otherwise each player in a group of two or more matching answers scores +1.
5. Words ignore surrounding whitespace and letter case, and a word used in an earlier round cannot be reused in the same game.
6. Missing the deadline counts as forfeiting. Only that player drops out; everyone else keeps playing.

See [`docs/game-rules.md`](docs/game-rules.md) for the full rules, configuration ranges, and scoring
details (written in Chinese).

## Deploy

Requires Node.js 24 and pnpm 12.

```sh
pnpm install --frozen-lockfile
# Copy .env.example to .env and configure a real PUBLIC_ORIGIN first.
pnpm build
pnpm start
```

Open <http://127.0.0.1:3000>; the same server serves both the page and the API.

Production notes:

- Copy `.env.example` to `.env` and set `PUBLIC_ORIGIN` to the real public HTTPS origin (for example, `https://sameword.example.com`). Use the same origin at build time and runtime. A trailing slash is normalized; credentials, other paths, queries, fragments, missing values, local addresses, and example domains fail production builds. Vite loads mode-specific environment files from the repository root; process variables take priority.
- `pnpm dev` needs no public origin. Local `pnpm start` serves the built files without changing their canonical or sharing URLs. To check game interactions, forward the configured HTTPS origin to the local service so origin checks and Secure cookies work.
- Production session cookies are Secure, HttpOnly, and SameSite=Strict, so the public service must be served over HTTPS.
- Run exactly one process — no Node cluster, no replicas. All state lives in memory, so a restart wipes games in progress.
- An Nginx reverse-proxy example is in [`deploy/nginx.conf`](deploy/nginx.conf); `/api/`, `/socket.io/`, and `/health` are forwarded to Node.

Environment variables, Nginx specifics, and a go-live checklist are in
[`docs/deployment.md`](docs/deployment.md) (Chinese).

## Development

```sh
pnpm install --frozen-lockfile
pnpm dev          # server watch + Vite, open http://127.0.0.1:5173
pnpm lint         # ESLint + Prettier + import sorting
pnpm typecheck    # import boundaries + client/test/server type checks
pnpm test:rules   # words, scoring, boundaries, timers
pnpm test:network # Socket.IO integration: capacity, privacy, takeover, history access
```

| Directory    | Responsibility                                                                      |
| ------------ | ----------------------------------------------------------------------------------- |
| `src/client` | Screens, live feedback, theme, and UI language; depends only on the shared protocol |
| `src/server` | HTTP and Socket.IO entry points, authoritative game rules, in-memory sessions       |
| `src/shared` | Zod command validation, public protocol, and shared word rules                      |

When adding or changing a command, start from `src/shared/protocol.ts`, then update dispatch in
`src/server/app.ts` and the rules in `src/server/rooms.ts` / `src/server/game.ts`, and finally the
client plus both language packs in `src/client/i18n/messages.ts`.

Module layout, protocol, HTTP endpoints, and tests are covered in
[`docs/architecture.md`](docs/architecture.md) and [`docs/development.md`](docs/development.md).

## More documentation

[`docs/`](docs/README.md) covers game rules, architecture, session lifecycle, interface details,
development, and deployment. Requirements and change records live in `openspec/`.
