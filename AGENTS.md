# AGENTS.md

Guidance for Codex when working in L2Realm.

## Project

L2Realm is a private Lineage 2 server catalog: https://l2realm.ru.

Stack:
- Frontend: Next.js 16, React 19
- Backend: NestJS 10, Prisma, PostgreSQL
- Infra: Docker Compose + nginx on VPS
- Auth: VK ID only
- Payments: YooKassa, VIP 5000 RUB / 31 days, boost 500 RUB / 7 days

Full historical feature notes live in `README.md`. Do not duplicate them here.

## Commands

```bash
# root development
npm run dev
npm run dev:backend
npm run dev:frontend
npm run db:migrate
npm run db:studio

# main pre-commit checks; there are no tests
cd frontend && npx tsc --noEmit
cd backend  && npx tsc --noEmit

# optional lint
cd frontend && npm run lint
cd backend  && npm run lint
```

Deploy is done manually by the user on VPS. See `docs/deploy.md`.

## Token-Saving Workflow

- Do not scan the whole repo by default. Start with `rg`/targeted file listings and open only files related to the requested feature.
- Treat this file as the hot path. Open docs below only when the task touches that domain.
- Before a larger edit, name the small set of files you expect to touch.
- For frontend work, read `frontend/AGENTS.md` first, then the relevant Next.js docs in `frontend/node_modules/next/dist/docs/` for the feature being edited.
- For backend work, read the target module/service/controller and `backend/prisma/schema.prisma` only when data shape matters.
- Do not summarize README/history/TODO in normal answers unless asked.
- Prefer narrow fixes and typecheck over broad refactors.
- If `rg` is unavailable, use PowerShell `Get-ChildItem` / `Select-String` narrowly.

## Critical Invariants

### Payments

- YooKassa webhook goes through nginx directly to backend: `nginx/conf.d/default.conf` has `location = /yookassa-webhook`.
- Do not route webhook through Next.js proxy. `frontend/src/app/api/proxy/[...path]/route.ts` blocks `/api/proxy/payments/webhook`.
- Backend webhook verification is defense-in-depth in `backend/src/payments/payments.service.ts`: CIDR whitelist, fetch payment from YooKassa, verify status/amount/metadata, idempotency via `paymentId`.
- nginx must overwrite XFF with `$remote_addr`; do not switch to `$proxy_add_x_forwarded_for`.

### Public Privacy

- `User.name` is VK full name and must never be returned from public review/server APIs.
- Public review user data should select only `id`, `nickname`, `avatar`.
- Known safe patterns: `reviews.service.findByServer()` and `servers.service.findOne()`.

### Server Rating

- `Server.rating` and `Server.ratingCount` are denormalized.
- `reviews.service.recalcRating()` runs on review create/approve/remove.
- Prisma cascade deletes bypass service hooks. After SQL/user mass deletes, run `POST /api/reviews/recalc-all` or `recalcAllRatings()`.
- Do not replace this with on-the-fly rating calculation.

### Server Of The Week

- The highlighted weekly server is computed in `servers.service.findAll()` from the full DB pool by `weeklyVotes`, not from filtered results.
- Monthly vote reset also resets `weeklyVotes`, so each month starts a new top race.

### Frontend SSR And Caching

- `/servers/[id]/` uses server `page.tsx` for `generateMetadata` and client `ServerDetailClient.tsx` for interactivity.
- Dynamic route handlers/components that fetch backend data need `revalidate` or `cache: 'no-store'`.
- Never remove dynamic/no-store caching protection from `frontend/src/app/sitemap.ts`.
- API client has two bases in `frontend/src/lib/api.ts`: browser uses `/api/proxy`, server uses `BACKEND_URL`.

### Monitoring

- Network probes must set a browser-like User-Agent. Some Lineage 2 sites block requests without UA.
- Pattern lives in `backend/src/monitoring/monitoring.service.ts :: pingUrl()`.

### Auth And Env

- User mutations should go through `AuthService`, not direct Prisma writes.
- Nickname can change once per 7 days; `null` `nicknameChangedAt` means first change is allowed.
- Backend must fail loudly when `JWT_SECRET` is missing or shorter than 32 chars.
- VK OAuth needs HTTPS redirect URI, so local login is not expected to work.
- New backend env vars required in Docker must be added to `docker-compose.yml` under `services.backend.environment`.

## Project Map

Backend:
- `backend/src/auth/` - JWT, VK OAuth, legacy email code, nickname update
- `backend/src/servers/` - CRUD, filters, server requests, subscriptions/boost merge, server-of-week flag
- `backend/src/reviews/` - reviews, moderation, rating recalculation
- `backend/src/monitoring/` - 5-minute monitoring cron, expired subscription reset
- `backend/src/payments/` - YooKassa purchase creation, webhook, VIP/boost activation
- `backend/src/favorites/` - user-server favorites
- `backend/src/votes/` - voting
- `backend/src/articles/` - blog articles
- `backend/prisma/schema.prisma` - database schema

Frontend:
- `frontend/src/lib/api.ts` - API client with browser/server base URLs
- `frontend/src/context/AuthContext.tsx` - user/token/admin state
- `frontend/src/app/api/proxy/[...path]/route.ts` - backend proxy and blocked webhook path
- `frontend/src/app/servers/[id]/page.tsx` - SSR metadata for server detail
- `frontend/src/app/servers/[id]/ServerDetailClient.tsx` - server detail UI
- `frontend/src/app/sitemap.ts` - dynamic sitemap, must keep build-time fetch protection
- `frontend/src/app/robots.ts` - robots
- `frontend/src/app/admin/page.tsx` - admin tools, rating recalculation
- `frontend/src/components/Header.tsx` and `Header.module.css` - responsive header

Infra:
- `docker-compose.yml` - services and backend environment passthrough
- `nginx/conf.d/default.conf` - routing, direct YooKassa webhook
- `.env.example` - env template

## Extra Docs

Open only when relevant:
- `docs/agent-architecture.md` - detailed architecture notes and file pointers
- `docs/deploy.md` - VPS deploy, env, diagnostics
- `docs/agent-backlog.md` - current prod checks and future ideas

## Do Not

- Do not expose VK full name through public APIs.
- Do not remove dynamic/no-store/revalidate protection from sitemap or backend-fetching routes.
- Do not remove `--force-recreate` from deploy notes after env changes.
- Do not add sensitive endpoints without explicit throttling.
- Do not change denormalized rating to read-time aggregation.
