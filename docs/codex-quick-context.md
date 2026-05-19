# Codex Quick Context

Этот файл читать первым перед работой с L2Realm. Он короткий специально, чтобы не тратить контекст на README/историю.

## Главное

- Проект: https://l2realm.ru, каталог приватных серверов Lineage 2.
- Рабочая папка Windows: `D:\Проекты\L2Realm`.
- Стек: Next.js 16 frontend, NestJS backend, Prisma, PostgreSQL, Docker Compose, nginx.
- Авторизация: VK ID. Локальный VK login обычно не проверяется из-за HTTPS redirect URI.
- Деплой только после явного подтверждения пользователя.
- Перед деплоем с Prisma migration делать бэкап базы на VPS.

## Проверки Перед Коммитом

```powershell
cd D:\Проекты\L2Realm\backend
npm.cmd run build

cd D:\Проекты\L2Realm\frontend
npm.cmd run build
```

Для мелких frontend-only правок backend можно не собирать, если backend не трогался. Если менялись Prisma/backend/API, собирать оба.

## Коммит И Деплой

Обычный frontend/backend deploy без миграции:

```powershell
git add .
git commit -m "..."
git push
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && git pull && docker compose up -d --build backend frontend"
```

Deploy с Prisma migration:

```powershell
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && mkdir -p backups && docker compose exec -T postgres pg_dump -U l2realm l2realm > backups/l2realm-pre-change-YYYYMMDD-HHMM.sql"
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && git pull && docker compose build backend frontend && docker compose run --rm backend npx prisma migrate deploy && docker compose up -d backend frontend"
```

Проверка после деплоя:

```powershell
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/
Invoke-WebRequest -UseBasicParsing https://l2realm.ru/sitemap.xml
ssh -i C:\Users\Egor_\.ssh\l2realm_vps_20260510 root@194.67.119.113 "cd /opt/l2realm && docker compose ps"
```

## Что Нельзя Ломать

- Не менять URL существующих страниц без отдельного решения и 301 redirects.
- Не ломать Markdown статей и описания серверов: переносы строк, заголовки и пробелы должны сохраняться.
- Не деплоить без подтверждения пользователя.
- Не трогать секреты и `.env` без явной причины.
- Не удалять защиту sitemap/SSR от build-time fetch ошибок.
- Не возвращать публично VK full name пользователя.
- YooKassa webhook должен идти напрямую в backend через nginx, не через Next proxy.

## SEO

- Для страниц серверов и статей должны оставаться `title`, `description`, `canonical`, OpenGraph и schema.org.
- `sitemap.xml` и `robots.txt` проверять после крупных изменений.
- Метаданные SEO не должны накручивать просмотры статей.
- Существующие route path не менять: `/`, `/servers/[id]`, `/coming-soon`, `/pricing`, `/blog`, `/blog/[slug]`.

## Основные Файлы

Frontend:
- `frontend/src/app/page.tsx` и `page.module.css` - главная, каталог, фильтры.
- `frontend/src/app/coming-soon/` - скоро открытие.
- `frontend/src/app/pricing/` - тарифы.
- `frontend/src/app/blog/` - список и страницы статей.
- `frontend/src/app/servers/[id]/` - страница проекта.
- `frontend/src/components/Header.tsx` - верхнее меню.
- `frontend/src/lib/api.ts` - API client.

Backend:
- `backend/src/servers/` - проекты, фильтры, карточки.
- `backend/src/articles/` - статьи и просмотры.
- `backend/src/votes/` - голосование и Vote Manager.
- `backend/src/payments/` - YooKassa.
- `backend/prisma/schema.prisma` - база.
- `backend/prisma/migrations/` - миграции.

Docs:
- `docs/deploy.md` - подробности деплоя.
- `docs/vote-manager.md` - текст для владельцев серверов.
- `docs/security-audit.md` - заметки по защите, audit и оставшимся рискам.
- `docs/agent-backlog.md` - будущие задачи.

## Текущие Важные Особенности

- Сортировка каталога: VIP -> Сервер недели -> BOOST -> остальные по голосам.
- Блок скачивания клиента/патча/апдейтера живет на странице проекта под описанием.
- В `/coming-soon` сервер должен висеть весь день даты открытия и пропадать только на следующий день.
- Голосование ограничено по IP и по авторизованному аккаунту за 24 часа.
- Просмотры статей хранятся в `Article.views` и увеличиваются при заходе на страницу статьи.
