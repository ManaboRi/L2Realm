# Codex Change Log

Short notes for future Codex sessions. Keep this file compact and append newest work on top.

## 2026-05-24

- Added a fresh-chat handoff prompt in `docs/new-chat-prompt.md` and compressed `docs/codex-quick-context.md` so future Codex chats can start from project rules/current state without rereading the long conversation.
- Fixed `VIP Скоро открытие` ordering: VIP future launches now stay above ordinary future launches, with each group sorted by opening date.
- Rebuilt `/blog` into a magazine-style article hub with a featured article, category sections, colored category sidebar, coming-soon sidebar block, prepared latest-comments block, and page-based pagination after 15 visible articles.
- Removed Yandex Metrika and VK Pixel from the global layout so the privacy policy no longer contradicts the shipped HTML; no cookie-consent banner is needed while analytics trackers stay disabled.
- Added `/terms` for ordinary users: account rules, reviews/votes, moderation/removal rights, anti-abuse rules, third-party server disclaimer, trademark disclaimer, and broad liability limits.
- Expanded `/legal` offer with right-holder disclaimer, stronger liability limits, downtime/force-majeure handling, and unilateral terms-change wording for paid services.
- Removed public and admin download/start-guide fields from the active UI/API validation to reduce NCSoft/Innova/4game file-distribution risk; old DB columns are left untouched for now to avoid a risky migration.
- Locally refined estimated online: smoother Moscow-time curve with gentler night changes, special lower night drop for Essence/Main, stronger but still gradual drop for very high rates, and hourly `instances[].onlineHistory` snapshots without a Prisma migration.
- Updated server online charts to prefer saved hourly history once enough points exist, fall back to deterministic estimates while history is still new, and render rounded y-axis labels like 6000/4000/2000.
- Changed admin server add/edit "Regions" into a free-text "Languages" field so project language flags/codes can be entered manually, and public server pages now display it as `Языки`.
- Tuned the homepage online green dot so it is smaller and slightly farther right.

## 2026-05-23

- Changed server-page online charts into peak-online views with day/week/month ranges, x-axis labels, hover points, and a smoother deterministic estimate model for public project graphs.
- Locally refined `/coming-soon`: launches that already started now show an "opened" state instead of a zero countdown, the filter can separate opened launches, and project-world cards on server pages keep a fixed centered width instead of stretching when there are few launches.
- Refined the local follow-up design pass: home hero stats are darker/equal text metrics with only online highlighted, server online graphs now render y-axis labels and hoverable SVG points, and the server-launches tab uses polished compact "world" cards with subtle future-start accents.
- Adjusted the local main/server visuals after review: hero stats became text-only without icons/blocks, VIP/week cards keep a gold aura, server detail hero stats lost inner boxes, and project launch cards are smaller/non-clickable without action buttons.

## 2026-05-22

- Moved the main catalog hero stats into a compact right-side column, removed the reviews metric from that hero block, and kept four cleaner site pulse numbers.
- Refined the main catalog polish locally: removed stat/sort container boxes, simplified card meta labels, removed estimated markers from homepage card online values, and made VIP/BOOST/week cards more visible.
- Polished the main catalog after review: simplified hero stat labels, made online a green accent metric, replaced the broken sort select with sort pills, enlarged server logos, and emphasized card online values.
- Reworked the main catalog hero/cards: added compact stat tiles from `/servers/stats`, brightened the catalog banner, made cards fully clickable, removed card descriptions/details buttons, and kept tags to one row with `+N`.
- Bypassed Next image optimization for tiny header nav icons so they load directly from `/images/nav-*.webp` instead of occasionally failing through `/_next/image`.
- Fixed admin server save validation for estimated online: `instances[].onlineError` may be `null` after a successful check/refresh.
- Added estimated per-launch online mode: admins can set a base value, backend recalculates hourly with Moscow time-of-day drops/peaks and light jitter, and public pages display estimated values with an `≈` marker.
- Reworked server detail locally around the new dashboard direction: shorter hero with stat tiles, separate `Информация` tab, overview online graph with 24h/7d/30d ranges, and a compact support/vote block that explains whether Vote Manager bonuses are connected.

## 2026-05-21

- Added the first per-project-launch online source system: each `instances` entry can store manual, Next.js/JSON, HTML JSON-variable, or HTML/regex source settings; admin can test sources, robots.txt is checked, backend refreshes saved sources hourly, and project online is summed from launches.
- Adjusted server overview articles to sit directly under the main information column with title/date only, removing the empty middle gap; future project launch cards now use a green strip/gradient instead of a full-card fill.
- Tightened the profile and server overview layouts after production review: reduced oversized profile width, compacted saved-article cards, moved the server sidebar back to the top row, and made linked project articles smaller.
- Widened `/profile` to match the newer full-width catalog/blog rhythm and aligned header/favorite icons.
- Made favorite buttons clearer: active state now indicates that the next click removes the server from favorites.
- Simplified `/profile`: removed the activity overview card, left menu, recent views, and extra hero stats; made logout subtle with confirmation.
- Reworked the server detail page locally toward the new wide project layout: hero banner, overview/reviews tabs, vote panel, download/start block, contacts, related articles, and compact project information.
- Added multi-region selection in the admin server form while keeping the existing `country` field format backward-compatible.
- Hid the donate selector from admin add/edit server forms; the database field is kept for compatibility.
- Polished the server detail layout: wider desktop container, no top action strip, vote button text, flag-only regions, improved external-site button, and higher project launch tiles without per-tile site buttons.
- Added a dedicated server launches tab on server pages, linked articles to projects through `Article.serverIds`, and improved future upload quality for wide banners/article images.

## 2026-05-20

- Rebuilt `/profile` into a dashboard: compact activity counts, favorites, opening reminders, latest reviews, recent server views, saved articles, and a focused Security tab for nickname changes.
- Added local saved-article bookmarks and recent-server history without touching article/server content formatting.
- Added authenticated vote-count API for profile stats and expanded opening reminders so header/profile can show openings within 24 hours.
- Kept `/coming-soon` hero title on one desktop line while preserving mobile wrapping.
- Added quick project memory in `docs/codex-quick-context.md` and linked it from `AGENTS.md`.
- Added deploy/security notes: DB backup before Prisma migrations, remaining backend Nest 10 audit risk, and Vote Manager owner guide cleanup.
- Hardened backend CORS origin matching and disabled Swagger imports in production runtime.
- Updated frontend/backend package metadata for current security audit state.
- Follow-up deploy fix: kept `@nestjs/swagger` as a production dependency because controllers and DTOs import Swagger decorators at runtime.
- Follow-up deploy fix: pinned `@nestjs/schedule` to `4.1.2` while backend Docker image still runs Node 18.
- Aligned desktop layout rhythm across `/`, `/coming-soon`, and `/blog`: matching hero height, heading font size, top spacing, and sidebar sticky offset.
- Verified `frontend` production build after layout changes.
