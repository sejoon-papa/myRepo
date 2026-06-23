# AGENTS.md

## Cursor Cloud specific instructions

### Product

The runnable application lives in `lotteryResort/` — a Korean-language **resort lottery** web app (React + Vite frontend, Express API, JSON file store at `server/data/store.json`). The repo root (`myRepo`) is only a thin wrapper.

### Services (development)

| Service | Command | Port |
|---------|---------|------|
| Vite (SPA + `/api` proxy) | `npm run dev:web` | 5173 |
| Express API | `npm run dev:api` | 4000 |
| Both together | `npm run dev` | 5173 + 4000 |

Run all commands from `/workspace/lotteryResort`. No Docker, database, or external services.

**Production-like single process:** `npm run preview` (builds `dist/` then serves UI + API on port 4000).

### Lint / build / test

- **Lint:** `npm run lint` (ESLint; the repo currently has pre-existing lint errors — do not treat a failing lint as a broken environment unless you changed code).
- **Build:** `npm run build`
- **Tests:** No automated test suite in this repo.

### Default logins (seeded users)

- Admin: `00000` / `관리자`
- Sample employee: `21508` / `박석훈`

Login requires a 5-digit employee ID and matching registered name via `POST /api/login`.

### Dev server notes

- Use **tmux** for long-running `npm run dev` (Vite + API via `concurrently`).
- Vite proxies `/api` to `http://localhost:4000`; the API must be running for full UI flows.
- `store.json` is created/updated at runtime; avoid resetting it unless testing fresh data.
