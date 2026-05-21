# Agent Backlog

Working notes for the user and Codex. Update when a task changes status.

## In Progress

- Empty

## Waiting For Production Check

- YooKassa end-to-end: real 500 RUB boost purchase from a second VK account.
- E-Global monitoring with new User-Agent: uptime bar should turn green about 30 minutes after deploy.
- Yandex Webmaster: verification meta tag was added in `frontend/src/app/layout.tsx`; ownership still needs confirmation.

## Confirmed In Production

- Full SSR for `/servers/[id]`: curl returns title, description, and reviews in HTML.
- `robots.txt` and dynamic `sitemap.xml`: both work and return valid content.

## Planned

- Image follow-up: old uploaded banners/article covers may still look compressed; reupload important images through the newer `banner`/`article` upload pipeline when convenient.
- Profile follow-up: move saved articles and recent views from localStorage to backend tables if cross-device sync becomes important.
- Profile follow-up: add calm avatar upload/change UX, with image size limits and moderation-safe storage.
- Auth follow-up: add a second registration/login path beyond VK ID when the site is ready for that work.
- Backend security upgrade: move Docker backend from Node 18 to Node 20 and upgrade Nest 10 -> Nest 11 to clear the remaining moderate production audit findings. See `docs/security-audit.md`.
- JSON-LD structured data with Product schema and rating for search result stars.
- Slugs instead of IDs in `/servers/[id]`, e.g. `/servers/newworld-interlude-x100`; needs 301 redirects and should wait until there is meaningful organic traffic.
- Clean old/noisy Prisma migrations or data-fix scripts in `backend/prisma/` when convenient.
