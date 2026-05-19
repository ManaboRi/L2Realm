# Deploy And Env Notes

The user deploys manually on the VPS. Codex usually prepares code locally and may commit/push when credentials or GitHub workflow are available.

## VPS Deploy

Run from `/opt/l2realm`:

```bash
git pull
docker compose up -d --build backend frontend
```

If Prisma migrations were added, make a database backup first and deploy migrations before recreating the app containers:

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U l2realm l2realm > backups/l2realm-pre-change-YYYYMMDD-HHMM.sql

git pull
docker compose build backend frontend
docker compose run --rm backend npx prisma migrate deploy
docker compose up -d backend frontend
```

Current production database service name is `postgres`, not `db`.

If env variables changed, force recreate the affected container:

```bash
docker compose up -d --force-recreate backend
```

Keep the `--force-recreate` note. Docker Compose can otherwise keep the old environment in a running container.

## Production Diagnostics

```bash
docker compose logs backend --tail 50
docker compose exec backend node -e "fetch('http://backend:4000/api/servers?limit=3').then(r=>r.text()).then(console.log)"
docker compose ps
```

## Env Files

- `/opt/l2realm/.env` on VPS is the production source of truth.
- Docker Compose reads root `.env` and passes values through `docker-compose.yml`.
- `backend/.env` and `frontend/.env.local` are local development only.
- `.env.example` in repo root is the shared template.

When adding a new backend env var needed in Docker, add it to:
- root `.env.example`
- `docker-compose.yml` under `services.backend.environment`
- local `backend/.env.example` if appropriate

Container backend does not read `backend/.env` in production.

## nginx

Relevant file:
- `nginx/conf.d/default.conf`

Critical route:
- `location = /yookassa-webhook` must go directly to backend.

Do not proxy YooKassa webhook through frontend.
