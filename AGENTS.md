# ytm-player

## Purpose

Full-stack personal YouTube Music player. The Express backend wraps YouTube Music APIs, manages authentication/session data, and serves the built React SPA. The browser client provides search, library pages, queue, and playback controls.

## Stack

- Backend: Node.js, TypeScript, Express 5, `tsx`, `youtubei.js`/`ytmusic-api` integrations.
- Frontend: React 17, TypeScript, Create React App 5, React Router 6, Redux Toolkit + persistence, MUI/Emotion.
- Package manager: npm; root and `client/` have separate lockfiles and dependencies.

## Layout

- `server.ts`: loads `.env`, initializes YouTube Music and session state, then listens (`HOST=0.0.0.0`, `PORT=3001` by default).
- `app.ts`: Express middleware, `/api/*` mounts, production SPA fallback, error handler.
- `routers/`: API endpoints grouped by tracks, search, playlists, albums, artists, radios, auth, home, and history.
- `middleware/`: validation and error handling.
- `utils/`: YouTube API wrappers, token/session handling, and parsers.
- `mappings/ytmusic-api/`: response/type mapping for the upstream API.
- `shared/`: types shared by server and client.
- `client/src/`: React app; `components/`, `pages/`, `layouts/`, `store/`, hooks, API client, and utilities.
- `client/build/`: generated production SPA served by Express when present; do not hand-edit.
- `tools/remote-codex/`: optional remote Codex helper, separate from application runtime.

## Setup and commands

Install both dependency trees:

```powershell
npm ci
npm ci --prefix client
```

Common commands (run from repository root):

```powershell
npm run dev       # backend watcher + CRA dev server
npm run server    # backend watcher only
npm run client    # frontend only; proxies API to localhost:3001
npm start         # backend without watcher
npm run build     # production frontend build
npm test --prefix client -- --watchAll=false
```

There is currently no root test or lint script. For backend/type changes, use a targeted TypeScript check when practical; for frontend changes, run its tests and/or build. Do not claim checks that were not run.

## Configuration

Copy `.env.example` to `.env` for local use. Never commit `.env`, cookies, tokens, or cached session data. Relevant groups:

- Server: `HOST`, `PORT`.
- YouTube Music: `YOUTUBE_MUSIC_COOKIE`, `YOUTUBE_MUSIC_AUTHUSER`, `YOUTUBE_MUSIC_PAGE_ID`, `YOUTUBE_MUSIC_LANGUAGE`, `YOUTUBE_PO_TOKEN_PROVIDER_URL`, `YOUTUBE_CACHE_DIR`.
- Remote helper: `REMOTE_CODEX_HOST`, `REMOTE_CODEX_PORT`, `REMOTE_CODEX_TOKEN`, `REMOTE_CODEX_EXECUTABLE`.

## Change guidelines

- Preserve the separation between HTTP routing (`routers/`), upstream integration/session logic (`utils/`), mappings, shared types, and UI state/components.
- Keep API paths under `/api`; non-API routes may fall through to the SPA in production.
- Update `shared/` types and both consumers together when an API shape changes.
- Treat authentication cookies, PO tokens, session/cache files, and playback URLs as sensitive; never log or fixture real values.
- Preserve unrelated working-tree changes and generated/build files unless the task explicitly targets them.
- Prefer focused changes and targeted verification; inspect the nearest existing implementation before introducing a new pattern or dependency.
