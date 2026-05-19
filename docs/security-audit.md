# Security Audit Notes

## 2026-05-20

Проверено:
- frontend/backend dependency audit;
- nginx route and headers;
- Next.js security headers/CSP;
- backend CORS, Helmet, throttling, auth guards;
- upload endpoint;
- public proxy route;
- secret leakage search;
- local trash/cache files.

Сделано:
- Frontend updated to `next@16.2.6` and `eslint-config-next@16.2.6`.
- Frontend `postcss` forced through npm `overrides` to a safe version; `npm audit --omit=dev` is clean.
- Backend CORS changed from prefix match to exact origin match.
- Backend `nodemailer` updated to `8.0.7`.
- Backend `@nestjs/config` updated to `4.0.4`, removing the lodash production high audit finding.
- Backend `@nestjs/schedule` updated to `6.1.3`.
- Backend `multer` forced to `2.1.1` through npm `overrides`.
- Backend dev-only tooling moved out of production dependencies: `@nestjs/cli`, `@nestjs/swagger`, `typescript`, `tsconfig-paths`, `@types/multer`.
- Swagger import made dev-only so production image does not need `@nestjs/swagger`.
- `.codex-screenshots/` added to `.gitignore`.
- Removed local trash: `.codex-screenshots/`, `.local-logs/`, `frontend/tsconfig.tsbuildinfo`.

Current audit state:
- `frontend`: `npm audit --omit=dev` returns 0 vulnerabilities.
- `backend`: `npm audit --omit=dev` has 4 moderate findings remaining.

Backend remaining findings:
- `@nestjs/core <= 11.1.17`.
- `@nestjs/common` transitive `file-type`.

Why not fixed immediately:
- Full fix requires Nest 10 -> Nest 11.
- `@nestjs/core@11.1.21` requires Node `>=20`.
- Backend Dockerfile currently uses Node 18.
- This should be a separate planned upgrade: backend Docker Node 20 + Nest 11 package set + full build/deploy check.

Important existing protections:
- nginx overwrites `X-Forwarded-For` with `$remote_addr`.
- YooKassa webhook goes directly to backend through nginx, not through Next proxy.
- Next.js sends CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.
- Backend uses Helmet and global throttling.
- Admin routes use JWT + `RolesGuard`.
- Uploads are admin-only, memory-limited to 8 MB, decoded/re-encoded through Sharp to WebP.
- Markdown is sanitized both on backend input and frontend render.
- Swagger is disabled in production.

Next security task:
- Plan and test Nest 11 + Node 20 backend upgrade in one separate commit.
