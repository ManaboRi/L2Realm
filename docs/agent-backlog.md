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

- JSON-LD structured data with Product schema and rating for search result stars.
- Slugs instead of IDs in `/servers/[id]`, e.g. `/servers/newworld-interlude-x100`; needs 301 redirects and should wait until there is meaningful organic traffic.
- Discounted VIP slots for servers from "Coming soon".
- Clean old/noisy Prisma migrations or data-fix scripts in `backend/prisma/` when convenient.
