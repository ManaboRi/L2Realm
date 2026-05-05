# Agent Architecture Notes

Detailed notes for Codex. Open this only when the task touches the relevant area.

## Payments: Defense In Depth

- Webhook from YooKassa goes through nginx directly to backend, bypassing Next.js.
- nginx route: `nginx/conf.d/default.conf` -> `location = /yookassa-webhook`.
- Next proxy route `/api/proxy/payments/webhook` is blocked in `frontend/src/app/api/proxy/[...path]/route.ts`, because otherwise a public proxy path could allow spoofing `X-Forwarded-For`.
- In `backend/src/payments/payments.service.ts`:
  - `isYookassaIp()` checks source IP against YooKassa CIDR whitelist.
  - `handleWebhook()` does not trust webhook body.
  - `fetchPaymentFromYookassa()` calls `GET /v3/payments/{id}` and verifies status, amount, and metadata.
  - `paymentId` is stored on `Subscription`/`Boost`; repeated webhooks are ignored.
- Backend uses `trust proxy: 1`; nginx must pass `$remote_addr`, not `$proxy_add_x_forwarded_for`.

## Denormalized Ratings

`Server.rating` and `Server.ratingCount` are denormalized fields. This is intentional because homepage and stats reads are frequent.

Relevant code:
- `backend/src/reviews/reviews.service.ts` -> `recalcRating()`
- `backend/src/reviews/reviews.service.ts` -> `recalcAllRatings()`
- Admin endpoint: `POST /api/reviews/recalc-all`

`recalcRating()` is called on review create/approve/remove. It is not called by Prisma cascade deletes at DB level. If users/reviews are deleted by SQL or mass delete, run full recalculation afterwards.

## Server Of The Day

Relevant code:
- `backend/src/servers/servers.service.ts` -> `sodSeed()`
- `backend/src/servers/servers.service.ts` -> `findAll()`

SoD is selected from the full server DB pool, not the filtered result. Otherwise search/filter input changes the highlighted server. The seed is based on 5-hour UTC windows: `Math.floor(hours / 5)`.

## Frontend SSR Metadata

`/servers/[id]/` is split:
- Server page: `frontend/src/app/servers/[id]/page.tsx`
- Client UI: `frontend/src/app/servers/[id]/ServerDetailClient.tsx`

The server page exports `generateMetadata()`, fetches through backend URL during SSR, and has `revalidate: 300`. This gives bots unique initial HTML with title, description, and OG data.

Apply this pattern if another dynamic public page needs indexed metadata.

## Sitemap And Backend Fetching

`frontend/src/app/sitemap.ts` must keep build-time fetch protection. Current code uses `export const dynamic = 'force-dynamic'` plus backend fetches with `cache: 'no-store'`.

Without this protection, `next build` in Docker can run while backend is not up yet. A failed backend fetch can create an empty sitemap that remains cached. Any route handler or server component pulling backend data should have `revalidate`, `dynamic = 'force-dynamic'`, or use `cache: 'no-store'` as appropriate.

## API Client

`frontend/src/lib/api.ts` uses two bases:
- Browser: `/api/proxy`
- Server SSR / metadata: `BACKEND_URL`, usually `http://backend:4000` in Docker

Server components may use `api.servers.get(id)`; the client chooses the correct base.

## Public Privacy

VK full name is stored in `User.name`. Do not expose it in public APIs.

Public review/server responses should return only:
- `id`
- `nickname`
- `avatar`

Known safe selections:
- `backend/src/reviews/reviews.service.ts` -> `findByServer()`
- `backend/src/servers/servers.service.ts` -> `findOne()`

## Monitoring

Relevant code:
- `backend/src/monitoring/monitoring.service.ts` -> `pingUrl()`
- Cron: `@Cron('*/5 * * * *')`
- Expired subscription reset: `resetExpiredSubscriptions()` hourly

Cloudflare and other anti-bot systems can block probes without User-Agent. Keep a browser-like UA in network-probe features.

## Auth

Relevant code:
- `backend/src/auth/auth.service.ts` -> `updateNickname()`
- `backend/src/auth/auth.service.ts` -> `getMe()`
- `backend/src/auth/jwt.strategy.ts`
- `backend/src/auth/auth.module.ts`

All user mutations should go through `AuthService`. Nickname changes are throttled to once per 7 days; `null` `nicknameChangedAt` means the user has never changed it and may change it now.

Backend validates `JWT_SECRET` on startup and should fail clearly if missing or shorter than 32 characters. Generate with `openssl rand -base64 48`.

VK OAuth requires HTTPS in `redirect_uri`, so local login cannot be fully tested.

## Backend Modules

- `auth/` - JWT strategy, VK OAuth, legacy email code, nicknames
- `servers/` - CRUD, filters, add-server requests, subscriptions and boosts, SoD
- `reviews/` - reviews, moderation, rating recalculation
- `monitoring/` - server pings, monitor logs, subscription expiration reset
- `payments/` - YooKassa createPurchase, webhook, VIP/boost activation
- `favorites/` - many-to-many user/server favorites
- `votes/` - monthly/weekly voting
- `articles/` - blog articles
- `prisma/` - schema and migrations

Global backend setup in `backend/src/app.module.ts`:
- `ThrottlerGuard` as `APP_GUARD`, 120 req/min
- `ScheduleModule`
- global `ConfigModule`

Swagger is available only in dev at `/api/docs`; production disables it.

## Frontend Pointers

- Review card/delete UI: `frontend/src/app/servers/[id]/ServerDetailClient.tsx`
- SSR server metadata: `frontend/src/app/servers/[id]/page.tsx`
- Dynamic sitemap: `frontend/src/app/sitemap.ts`
- Robots: `frontend/src/app/robots.ts`
- Yandex Metrika: `frontend/src/components/YandexMetrika.tsx`
- Webmaster verification: `frontend/src/app/layout.tsx`
- Security headers: `frontend/next.config.ts`
- Auth context: `frontend/src/context/AuthContext.tsx`
- API client: `frontend/src/lib/api.ts`
- VK OAuth PKCE: `frontend/src/lib/vkAuth.ts` and `frontend/src/app/auth/vk/callback/page.tsx`
- Proxy blocked paths: `frontend/src/app/api/proxy/[...path]/route.ts`
- Nickname cooldown UI: `frontend/src/app/profile/page.tsx`
- Rating recalculation button: `frontend/src/app/admin/page.tsx`
- Mobile header: `frontend/src/components/Header.tsx` and `Header.module.css`
