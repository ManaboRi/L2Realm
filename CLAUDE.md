# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект

**L2Realm** — каталог приватных серверов Lineage 2 (https://l2realm.ru). Next.js 16 (frontend) + NestJS 10 (backend) + PostgreSQL/Prisma + Docker Compose на VPS. Монетизация через ЮКассу (VIP 5000₽/31 день, буст 250₽/7 дней), авторизация только через VK ID. Полный исторический чек-лист фич — в `README.md` (не дублировать).

## Частые команды

```bash
# Разработка (root)
npm run dev                        # параллельно backend + frontend
npm run dev:backend                # NestJS на :4000
npm run dev:frontend               # Next.js на :3000
npm run db:migrate                 # prisma migrate dev
npm run db:studio                  # Prisma Studio

# Проверка перед коммитом (тестов нет — typecheck это основная гарантия)
cd frontend && npx tsc --noEmit
cd backend  && npx tsc --noEmit

# Деплой на VPS (из /opt/l2realm)
git pull
docker compose up -d --build backend frontend
# --force-recreate ОБЯЗАТЕЛЕН, если меняли переменные в .env
docker compose up -d --force-recreate backend

# Диагностика в проде
docker compose logs backend --tail 50
docker compose exec backend node -e "fetch('http://backend:4000/api/servers?limit=3').then(r=>r.text()).then(console.log)"
```

Тестов нет, линтер есть (`npm run lint` в обоих проектах), но обычно не гоняю — typecheck + визуальная проверка на dev-сервере покрывают практически всё.

## Архитектурные особенности (не обнаружить простым чтением файлов)

### Платежи: defense-in-depth
- Webhook от ЮКассы **идёт в nginx → backend напрямую**, минуя Next.js (`location = /yookassa-webhook` в `nginx/conf.d/default.conf`). Путь `/api/proxy/payments/webhook` явно блокируется в `frontend/src/app/api/proxy/[...path]/route.ts` — иначе `X-Forwarded-For` можно заспуфить через публичный proxy.
- В `backend/src/payments/payments.service.ts`:
  1. IP проверяется по CIDR-whitelist ЮКассы
  2. Телу webhook **не доверяем** — делаем `GET /v3/payments/{id}` и сверяем status/сумму/metadata
  3. Идемпотентность: `paymentId` сохраняется в `Subscription`/`Boost`, повторный webhook игнорируется
- `trust proxy: 1` + `$remote_addr` в nginx (не `$proxy_add_x_forwarded_for`) — XFF перезаписывается, клиент не может добавить свой IP первым.

### Денормализованные поля на Server
`Server.rating` и `Server.ratingCount` — денормализованы. `reviews.service.recalcRating()` вызывается при `create/approve/remove`, но **НЕ при каскадном удалении юзеров** (`onDelete: Cascade` в Prisma работает на уровне БД, мимо хуков). Если удаляешь юзеров SQL-ом или добавляешь массовое удаление — обязательно гонять `POST /api/reviews/recalc-all` (или `recalcAllRatings()`). В админке есть кнопка «↻ Пересчитать рейтинги».

### «Сервер дня» — 5-часовая ротация из полного пула
`backend/src/servers/servers.service.ts :: findAll()`. SoD считается из **всей БД** (не из отфильтрованного результата), иначе ввод в поиск «переключал» SoD. Сид — по 5-часовым окнам UTC (`Math.floor(hours/5)`), получается 4-5 смен в сутки.

### Frontend: SSR-метаданные
`/servers/[id]/` разделена на серверный `page.tsx` (экспортирует `generateMetadata`, делает fetch на `http://backend:4000`) и клиентский `ServerDetailClient.tsx` (вся интерактивная логика). Сделано для индексации — боты получают уникальный `<title>/description/OG` в initial HTML. `revalidate: 300`. Тот же паттерн применять, если понадобится SSR-метаданные на других динамических страницах.

### Sitemap: обязательно `export const revalidate`
`app/sitemap.ts` без этой строки запускается на этапе `next build` в Docker, когда контейнер backend ещё не поднят — fetch падает, пустой sitemap кешируется навсегда. Любой route handler, тянущий данные с backend, должен иметь `revalidate` либо `cache: 'no-store'`.

### API-клиент с двумя BASE
`frontend/src/lib/api.ts`: в браузере ходит через `/api/proxy` (Next.js rewrites → backend), на сервере (SSR/generateMetadata) — напрямую по `BACKEND_URL=http://backend:4000`. При написании серверных компонентов можно использовать `api.servers.get(id)` — всё равно попадёт куда нужно.

### Приватность: VK ФИО не в публичном API
`User.name` (полное имя из VK) **никогда** не возвращается из публичных эндпоинтов отзывов. `reviews.service.findByServer()` и `servers.service.findOne()` явно селектят только `id/nickname/avatar` из пользователя. Если добавляешь новое место, где показываются отзывы — строго следуй этому паттерну.

### Мониторинг требует User-Agent
`backend/src/monitoring/monitoring.service.ts :: pingUrl()`. Cloudflare/anti-bot блокируют запросы без UA как подозрительные (E-Global/lu4.org был жертвой — показывал offline всегда). Используем браузерный UA. Если добавляешь новые network-probe фичи — ставь UA.

### Никнейм throttle
Смена никнейма — раз в 7 дней (`User.nicknameChangedAt`). Первая смена разрешена всем (`null` означает «никогда не менял»). `/auth/me` отдаёт `nicknameChangedAt` — фронт считает cooldown сам. `updateNickname()` в `auth.service.ts` бросает `BadRequestException` если рано.

### JWT_SECRET validation на старте
Backend падает с понятной ошибкой, если `JWT_SECRET` не задан или < 32 символов. Генерить: `openssl rand -base64 48`. Валидация в `jwt.strategy.ts` и `auth.module.ts`.

### VK OAuth локально не работает
VK требует HTTPS в `redirect_uri`. Локально можно проверить всё кроме логина — логин тестится только в проде. Это не баг, это ограничение VK.

## Frontend: Next.js 16

**ВАЖНО:** см. `frontend/CLAUDE.md` → `frontend/AGENTS.md`. Это Next.js 16 с breaking changes относительно твоей тренировочной базы. API, конвенции и структура могут отличаться. Перед написанием кода читай `frontend/node_modules/next/dist/docs/` по теме (metadata, sitemap, script и т.д.).

Конкретные отличия, на которые натыкался:
- `params` в `page.tsx` — это `Promise<{...}>`, нужно `await`.
- `sitemap.ts`/`robots.ts` — файловые конвенции, кладутся в `app/`, автоматически доступны по `/sitemap.xml`/`/robots.txt`.
- `next/script` с `strategy="afterInteractive"` — для третьих скриптов (Яндекс.Метрика). Inline-скрипты требуют `id`.

## Бэкенд: структура

- `auth/` — JWT стратегия, VK OAuth, email-код (legacy), никнеймы. Все модификации юзера идут через `AuthService` — не ходи напрямую в Prisma.
- `servers/` — CRUD + фильтры + заявки на добавление. `findAll()` склеивает подписки и бусты, вычисляет SoD.
- `reviews/` — отзывы + модерация + recalc рейтинга.
- `monitoring/` — cron `*/5` мин, пингует серверы, пишет `MonitorLog`. Он же раз в час обнуляет истёкшие подписки.
- `payments/` — ЮКасса: createPurchase + webhook + активация VIP/бустов.
- `favorites/` — избранное (many-to-many user↔server).
- `prisma/` — schema + migrations. Seed через `npm run db:seed`.

Глобально в `app.module.ts`: `ThrottlerGuard` как APP_GUARD (120 req/min), `ScheduleModule`, `ConfigModule.forRoot({ isGlobal: true })`.

Swagger доступен только в dev на `/api/docs` — в проде явно отключён (не раскрываем карту endpoints).

## Env-файлы

- `/opt/l2realm/.env` (корневой на VPS, рядом с `docker-compose.yml`) — **источник правды для прода**. Docker Compose читает отсюда и пробрасывает в контейнеры через блок `environment:` в yml. Пути типа `backend/.env` в контейнере нет (другой WORKDIR).
- `backend/.env` и `frontend/.env.local` — только для локальной разработки.
- `.env.example` в корне — шаблон всех нужных переменных (POSTGRES_PASSWORD, JWT_SECRET, FRONTEND_URL, VK_*, YOOKASSA_*).

При добавлении новой env-переменной, которую должен видеть backend в Docker, **обязательно** добавить её в `docker-compose.yml` в блок `backend.environment:`. Без этого переменная будет в root `.env`, но не попадёт в контейнер.

## Где что лежит для частых задач

Быстрые указатели, чтобы не grep'ать. Сверяться с текущим кодом перед правкой — строки могут съехать.

### Бэкенд
- Webhook-верификация ЮКассы: `backend/src/payments/payments.service.ts` → `handleWebhook()`, `fetchPaymentFromYookassa()`, `isYookassaIp()`
- Активация VIP/буста и денежные константы: `payments.service.ts` → `VIP_PRICE/VIP_DAYS/BOOST_PRICE/BOOST_DAYS`, `activateVip()`, `activateBoost()`
- Ротация «Сервер дня»: `servers.service.ts` → `sodSeed()` и `findAll()` (пул из всей БД, окно 5ч)
- Пересчёт денормализованного рейтинга: `reviews.service.ts` → `recalcRating()`, `recalcAllRatings()`, админ-эндпоинт `POST /api/reviews/recalc-all`
- Удаление отзыва (юзер/админ): `reviews.service.ts` → `remove(id, actorId, actorRole)`
- Смена никнейма + throttle 7 дней: `auth.service.ts` → `updateNickname()`, `getMe()` отдаёт `nicknameChangedAt`
- Мониторинг пинга с UA: `monitoring.service.ts` → `pingUrl()`, cron `@Cron('*/5 * * * *')`
- Сброс истёкших подписок: `monitoring.service.ts` → `resetExpiredSubscriptions()` (ежечасно)
- Rate limits: `auth.controller.ts`, `payments.controller.ts` → `@Throttle({...})`
- JWT ≥32 валидация: `jwt.strategy.ts`, `auth.module.ts`

### Фронтенд
- Карточка отзыва с удалением: `frontend/src/app/servers/[id]/ServerDetailClient.tsx` → `ReviewCard` в конце файла, `deleteReview()` в компоненте
- SSR-метаданные сервера: `app/servers/[id]/page.tsx` → `generateMetadata()` с `revalidate: 300`
- Sitemap динамический: `app/sitemap.ts` (обязательно `export const revalidate = 600`)
- Robots: `app/robots.ts`
- Яндекс.Метрика + SPA-tracker: `components/YandexMetrika.tsx`
- Верификация Вебмастера: `app/layout.tsx` → `metadata.verification.yandex`
- Security headers фронта: `next.config.ts` → `securityHeaders[]`
- AuthContext (user/token/isAdmin): `context/AuthContext.tsx`
- API-клиент (двойной BASE): `lib/api.ts`
- VK OAuth PKCE: `lib/vkAuth.ts` + `app/auth/vk/callback/page.tsx`
- Прокси с BLOCKED_PATHS: `app/api/proxy/[...path]/route.ts`
- Cooldown никнейма в UI: `app/profile/page.tsx` — блок с `user.nicknameChangedAt`
- Админ-кнопка «Пересчитать рейтинги»: `app/admin/page.tsx` → `recalcAllRatings()`
- Мобильный хидер: `components/Header.tsx` + `Header.module.css` (медиа `max-width: 600px/380px`)

### Инфра
- nginx webhook-route: `nginx/conf.d/default.conf` → `location = /yookassa-webhook`
- Docker backend env: `docker-compose.yml` → `services.backend.environment`
- Prisma миграции: `backend/prisma/migrations/` (deploy на старте контейнера через CMD Dockerfile)
- Шаблон env: корневой `.env.example`

## Что НЕ делать

- Не менять `name` → `nickname` в публичных API-ответах назад — специально убирали VK ФИО из выдачи.
- Не удалять `revalidate` из `app/sitemap.ts`.
- Не удалять `--force-recreate` из инструкций деплоя после изменения env.
- Не создавать новые endpoints без Throttle-декоратора, если они принимают чувствительные данные.
- Не трогать `recalcRating` денормализацию в сторону «давайте считать на лету» — серверов немного, но на главной и stats'ах этот read хитится часто.

## Текущий чек-лист / TODO

*Секция — для рабочих задач пользователя, обновляется по ходу работы. История закрытых задач живёт в `git log`.*

**В работе:**
- (пусто)

**Ждёт проверки на проде:**
- ЮКасса end-to-end: боевая покупка буста 250₽ со второго аккаунта (нужен второй VK — у юзера пока нет)
- E-Global мониторинг с новым UA — через 30 минут после последнего деплоя аптайм-бар должен стать зелёным
- Яндекс.Вебмастер: verification-метатег добавлен в `layout.tsx`, нужно подтвердить права

**Подтверждено в проде:**
- Full SSR для `/servers/[id]` — curl возвращает название/описание/отзывы в HTML (аудит SEO §2, §7)
- robots.txt + dynamic sitemap.xml — работают, отдают валидный контент (аудит SEO §2, §9)

**В планах:**
- JSON-LD structured data (Product schema с рейтингом) для звёздочек в выдаче Google/Яндекса
- Slug вместо ID в `/servers/[id]` — `/servers/newworld-interlude-x100`. Большая работа с 301-редиректами; делать когда появится ощутимый органический трафик
- Возможность покупать VIP-места на серверах из «Скоро открытие» по сниженной цене
- Уборка мусорных миграций / data-fix скриптов из `backend/prisma/` когда дойдут руки
