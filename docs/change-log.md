# Codex Change Log

Short notes for future Codex sessions. Keep this file compact and append newest work on top.

## 2026-05-21

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
