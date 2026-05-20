# Codex Change Log

Short notes for future Codex sessions. Keep this file compact and append newest work on top.

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
