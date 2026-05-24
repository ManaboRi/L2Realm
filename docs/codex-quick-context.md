# Codex Quick Context

Read this first before working on L2Realm. Keep it short: it exists so a new Codex chat can continue without rereading the whole repo history.

## Project

- Site: `https://l2realm.ru`, a private Lineage 2 server catalog.
- Windows workspace: `D:\Проекты\L2Realm`.
- Stack: Next.js 16 frontend, NestJS backend, Prisma, PostgreSQL, Docker Compose, nginx.
- Auth: VK ID. Local VK login is usually not testable because VK requires HTTPS redirect URI.
- Deploy is manual over SSH to the VPS.
- Never deploy without explicit user approval. If a Prisma migration is included, make a DB backup on the VPS before deploy.

## Safety Rules

- Do not change existing public URLs unless the user explicitly asks and 301 redirects are prepared.
- Do not break Markdown formatting in articles or server descriptions. Line breaks, headings and spaces are important.
- Do not touch `.env` or secrets unless the task clearly requires it.
- Do not expose VK full names publicly; public UI should use nickname/avatar only.
- Keep `sitemap.xml`, `robots.txt`, SSR metadata and canonical URLs working after SEO-related changes.

## Current Public Routes

- `/` - main server catalog with filters, search, sort and server cards.
- `/servers/[id]` - project page with SEO metadata, hero, tabs `Обзор / Сервера / Отзывы`, vote/support panel, contacts and linked articles.
- `/coming-soon` - future openings. A server stays visible for the whole opening date and disappears the next day.
- `/pricing` - tariffs and promotion.
- `/blog` and `/blog/[slug]` - articles.
- `/profile` - user dashboard: profile, favorites, reminders, reviews, saved articles, security/nickname.

## Important Current Features

- Catalog sorting: VIP -> Server of the Week -> BOOST -> the rest by all-time votes.
- Voting is limited by IP and authenticated account for 24 hours.
- Vote Manager API for server owners:
  `https://l2realm.ru/api/vote/check?server_id=ID&nickname=НИК`
- Download/client/patch/updater blocks are intentionally disabled in public UI, admin UI and API validation to reduce right-holder risk.
- Server pages now have a separate `Сервера` tab for project launches/instances.
- Articles can be linked to projects through `Article.serverIds`; linked articles appear on the server page.
- Future banner/article uploads are kept wider and higher quality (`banner` and `article` upload types).
- Article views are stored in `Article.views` and increment when the article page is opened.

## Recent Migration

- `20260521124500_article_server_links`
- Adds `Article.serverIds TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
- Adds a GIN index on `Article.serverIds`
- Deployment with this migration requires DB backup first and `npx prisma migrate deploy`.

## Checks Before Commit

```powershell
cd D:\Проекты\L2Realm\backend
npm.cmd run build

cd D:\Проекты\L2Realm\frontend
npm.cmd run build

cd D:\Проекты\L2Realm
git diff --check
```

For frontend-only CSS/UI edits, backend build can be skipped if backend/schema/API did not change. If Prisma/backend/API changed, build both.

## Deploy Commands

Normal deploy:

```powershell
git add .
git commit -m "..."
git push
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && git pull && docker compose up -d --build backend frontend"
```

Deploy with Prisma migration:

```powershell
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && mkdir -p backups && docker compose exec -T postgres pg_dump -U l2realm l2realm > backups/l2realm-pre-change-YYYYMMDD-HHMM.sql"
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && git pull && docker compose build backend frontend && docker compose run --rm backend npx prisma migrate deploy && docker compose up -d backend frontend"
```

Post-deploy smoke checks:

```powershell
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/servers/Scryde
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/profile
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/sitemap.xml
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && docker compose ps"
```

## Key Files

Frontend:
- `frontend/src/app/page.tsx`, `HomeClient.tsx`, `page.module.css` - main catalog.
- `frontend/src/app/servers/[id]/page.tsx` - SSR metadata for server pages.
- `frontend/src/app/servers/[id]/ServerDetailClient.tsx` - server page UI.
- `frontend/src/app/coming-soon/` - opening list.
- `frontend/src/app/pricing/` - tariffs.
- `frontend/src/app/blog/` - articles.
- `frontend/src/app/profile/page.tsx` - profile dashboard.
- `frontend/src/components/Header.tsx` - top navigation.
- `frontend/src/lib/api.ts` and `frontend/src/lib/types.ts` - API/types.

Backend:
- `backend/src/servers/` - projects, filters, add-server requests, subscriptions/boosts.
- `backend/src/articles/` - articles, admin article editing, views, linked server IDs.
- `backend/src/votes/` - voting and Vote Manager.
- `backend/src/favorites/` - user favorites.
- `backend/src/reviews/` - reviews and rating recalculation.
- `backend/src/payments/` - YooKassa.
- `backend/prisma/schema.prisma` and `backend/prisma/migrations/` - DB schema.

Docs:
- `docs/deploy.md` - deployment details.
- `docs/vote-manager.md` - text/instructions for server owners.
- `docs/security-audit.md` - security/audit state.
- `docs/agent-architecture.md` - deeper architecture notes.
- `docs/change-log.md` - short chronological notes.
- `docs/agent-backlog.md` - future tasks.
