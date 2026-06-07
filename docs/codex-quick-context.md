# Codex Quick Context

Read this file first in every new L2Realm chat. It is the compact operational memory. Do not reread the whole repo unless the task needs it.

## Project

- Site: `https://l2realm.ru`, private Lineage 2 server catalog.
- Workspace on Windows: `D:\Проекты\L2Realm`.
- Stack: Next.js 16 frontend, NestJS backend, Prisma, PostgreSQL, Docker Compose, nginx.
- Auth: VK ID. Local VK login is usually not testable because VK requires HTTPS redirect URI.
- Deploy is manual over SSH to the VPS.
- Rule: never deploy without explicit user approval. If Prisma migrations are included, make a DB backup first.

## Current Production State

- Latest known deployed commit: `f30274f Harden legal pages and refresh blog`.
- Legal pages exist: `/terms`, `/legal`, `/privacy`.
- Yandex Metrika and VK Pixel are disabled, so no cookie banner is currently needed for trackers.
- Public/admin download-client/patch/updater/start-guide UI is disabled to reduce right-holder risk. Old DB fields may still exist; do not re-enable without user approval.
- Blog was recently rebuilt into a magazine-style page, but the user now wants it simplified again. See "Next Task".

## Critical Rules

- Do not change public URLs unless the user explicitly asks and redirects are planned.
- Do not break Markdown formatting in articles or server descriptions. Line breaks, headings and spacing matter.
- Do not touch `.env` or secrets unless the task clearly requires it.
- Do not expose VK full names publicly. Public UI/API should use nickname/avatar only.
- Keep `sitemap.xml`, `robots.txt`, SSR metadata and canonical URLs working after SEO changes.
- For frontend-only CSS/UI changes, backend build can be skipped. For API/schema/backend changes, build both.
- Use targeted reads with `rg`; avoid scanning the full repo by default.

## Current Public Routes

- `/` - main server catalog with filters, search, sort and compact server cards.
- `/servers/[id]` - project page with SEO metadata, hero, tabs `Обзор / Информация / Сервера / Отзывы`, online chart, vote/support panel, contacts and linked articles.
- `/coming-soon` - future openings. A launch stays visible for the whole opening day and can show an opened state briefly after the timer ends.
- `/pricing` - tariffs and promotion.
- `/blog` and `/blog/[slug]` - articles.
- `/profile` - user dashboard: profile, favorites, reminders, reviews, saved articles, security/nickname.
- `/terms`, `/legal`, `/privacy` - legal pages.

## Important Features

- Catalog sorting: VIP -> Server of the Week -> BOOST -> the rest by all-time votes.
- Coming-soon sorting: VIP future launches should be above ordinary future launches; each group sorts by opening date.
- Voting is limited by IP and authenticated account for 24 hours.
- Vote Manager API for server owners:
  `https://l2realm.ru/api/vote/check?server_id=ID&nickname=НИК`
- Server pages have a separate `Сервера` tab for project launches/instances.
- Articles can be linked to projects through `Article.serverIds`; linked articles appear on the server page.
- Article views are stored in `Article.views` and increment when the article page is opened.
- Estimated online exists for project launches. It uses Moscow time curves, chronicle/rate-aware night drops, and hourly `instances[].onlineHistory` snapshots without a Prisma migration.
- Admin server add/edit "Languages" is a free-text field; user may paste flags/country codes manually.

## Next Task From User

Blog cleanup requested, not yet implemented in this handoff:

- Remove the yellow middle strip on `/blog`.
- Change article grid from 4 columns to 3 columns.
- Remove the top featured article block.
- Render sections in this order: reviews first, then news, then other categories. News should look like normal article cards, not a separate row/table style.
- Make the right sidebar scroll normally with the page, not sticky.
- Remove the sidebar promo block:
  "Не пропусти старт! Следи за будущими открытиями..."

Likely files:
- `frontend/src/app/blog/page.tsx`
- `frontend/src/app/blog/page.module.css`

## Checks Before Commit

```powershell
cd D:\Проекты\L2Realm\frontend
npm.cmd run build

cd D:\Проекты\L2Realm\backend
npm.cmd run build

cd D:\Проекты\L2Realm
git diff --check
```

For frontend-only blog/CSS edits, usually run:

```powershell
cd D:\Проекты\L2Realm\frontend
npm.cmd run build

cd D:\Проекты\L2Realm
git diff --check
```

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
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/blog
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/servers/Scryde
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/coming-soon
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
- `backend/src/servers/` - projects, filters, add-server requests, subscriptions/boosts, estimated online.
- `backend/src/articles/` - articles, admin article editing, views, linked server IDs.
- `backend/src/votes/` - voting and Vote Manager.
- `backend/src/favorites/` - user favorites.
- `backend/src/reviews/` - reviews and rating recalculation.
- `backend/src/payments/` - YooKassa.
- `backend/prisma/schema.prisma` and `backend/prisma/migrations/` - DB schema.

Docs:
- `docs/new-chat-prompt.md` - copy-paste prompt for starting a fresh chat.
- `docs/deploy.md` - deployment details.
- `docs/vote-manager.md` - instructions for server owners.
- `docs/security-audit.md` - security/audit state.
- `docs/agent-architecture.md` - deeper architecture notes.
- `docs/change-log.md` - short chronological notes.
- `docs/agent-backlog.md` - future tasks.
