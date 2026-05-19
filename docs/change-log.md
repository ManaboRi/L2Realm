# Codex Change Log

Short notes for future Codex sessions. Keep this file compact and append newest work on top.

## 2026-05-20

- Added quick project memory in `docs/codex-quick-context.md` and linked it from `AGENTS.md`.
- Added deploy/security notes: DB backup before Prisma migrations, remaining backend Nest 10 audit risk, and Vote Manager owner guide cleanup.
- Hardened backend CORS origin matching and disabled Swagger imports in production runtime.
- Updated frontend/backend package metadata for current security audit state.
- Follow-up deploy fix: kept `@nestjs/swagger` as a production dependency because controllers and DTOs import Swagger decorators at runtime.
- Follow-up deploy fix: pinned `@nestjs/schedule` to `4.1.2` while backend Docker image still runs Node 18.
- Aligned desktop layout rhythm across `/`, `/coming-soon`, and `/blog`: matching hero height, heading font size, top spacing, and sidebar sticky offset.
- Verified `frontend` production build after layout changes.
