# L2Realm — каталог серверов Lineage 2

Каталог приватных серверов L2 с рейтингом, отзывами и live-мониторингом. Прод: **https://l2realm.ru**.

---

## ✅ Что сделано (чек-лист)

### Каталог и серверы
- [x] Список серверов с фильтрами (хроники, рейты, донат, тип, страна)
- [x] Страница сервера: описание, соцсети, отзывы, live-аптайм-график
- [x] Заявка на добавление сервера (до оплаты) + модерация в админке
- [x] Кастомный дизайн в стиле L2 (цвета, Cinzel, золотые акценты)
- [x] Блок «Скоро» (coming soon)

### Пользователи и вход
- [x] Регистрация/вход через **VK ID** (OAuth 2.1 + PKCE) — единственный способ авторизации
- [x] JWT 7 дней, автовход по localStorage
- [x] Никнейм: при первом входе модалка выбора, авто-`User_12345` fallback, уникальный (case-insensitive), 3–16 символов
- [x] «Личный кабинет»: аватар/инициал, ник, VK ID, роль, смена ника, избранное, мои отзывы
- [x] Ник и аватар показываются в шапке, отзывах и профиле (email — только как «VK ID»)
- [x] Аватар: автоматически из VK, обновляется на каждом входе (кастомная загрузка не делалась — не нужна)
- [x] Шапка: чип-кнопка с аватаром + ником → клик ведёт в `/profile`. Кнопка «Выйти» перенесена внутрь профиля.
- [x] Роли: `USER` / `ADMIN` (новые VK-юзеры создаются `USER`; админка выдаётся только SQL-ом)
- [ ] Yandex ID (в планах)

### Избранное (watchlist)
- [x] Кнопка «⚔ В избранное / ★ В избранном» на странице сервера
- [x] Список избранных серверов в профиле (иконка, название, хроника/рейты, статус онлайн, убрать)
- [x] Backend: модель Favorite, endpoints `GET /api/favorites`, `GET /api/favorites/ids`, `POST/DELETE /api/favorites/:serverId`

### Отзывы
- [x] 1 аккаунт = 1 отзыв на сервер (редактирование разрешено)
- [x] Модерация: новый отзыв ждёт одобрения админа
- [x] Рейтинг 1-5 звёзд + текст
- [x] Отзывы подписаны никнеймом + аватаром автора
- [x] Просмотр своих отзывов в профиле
- [ ] Черновики отзывов (в планах)

### Мониторинг
- [x] Пинг серверов каждые 5 минут (MonitoringService)
- [x] История аптайма по дням → график на странице сервера
- [x] Лог в `MonitorLog` (player count + ping)

### Тарифы и оплата
- [x] FREE / Стандарт / Премиум / VIP
- [x] ЮКасса (интеграция готова, ждёт реальных ключей)
- [x] Авто-сброс подписки на FREE по истечении (cron)
- [x] Админ может активировать тариф вручную

### Админ-панель
- [x] CRUD серверов
- [x] Модерация отзывов
- [x] Модерация заявок на добавление
- [x] Список всех платежей

### Telegram-бот
- [x] Парсинг новостей из каналов серверов → в ленту сервера

### Инфраструктура (прод)
- [x] VPS (Ubuntu 24.04), Docker Compose: postgres + backend + frontend + nginx
- [x] Домен + DNS → VPS
- [x] SSL через Let's Encrypt (auto-renew через cron)
- [x] Ежедневный бэкап PostgreSQL (pg_dump → gzip, хранение 7 дней)
- [x] SSH только по ключам (пароль отключен)
- [x] fail2ban на sshd
- [x] Прокси `/api/proxy/*` (Next.js → NestJS, чтобы не CORS-ить)
- [x] Prisma migrate deploy автоматом при старте backend
- [ ] Swap-файл 2 ГБ (в планах)
- [ ] Uptime-мониторинг внешний (в планах)
- [ ] Еженедельный забор бэкапов на локальный ПК (в планах)

---

## Стек

| Слой | Технология |
|------|------------|
| Frontend | Next.js 16 (App Router, Turbopack, TypeScript) |
| Backend | NestJS 10 (TypeScript) |
| БД | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (passport-jwt) + VK ID OAuth |
| Оплата | ЮКасса |
| Деплой | Docker Compose + nginx + Let's Encrypt |

---

## Структура

```
L21Realm/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/               # JWT, VK OAuth, profile
│   │   ├── servers/            # CRUD + фильтры + заявки
│   │   ├── reviews/            # Отзывы + модерация
│   │   ├── monitoring/         # Пинг серверов каждые 5 мин
│   │   ├── payments/           # ЮКасса + cron сброса подписок
│   │   └── news/               # Telegram-парсер
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       └── seed.ts
├── frontend/                   # Next.js
│   └── src/
│       ├── app/
│       │   ├── page.tsx        # Главная — каталог
│       │   ├── servers/[id]/   # Страница сервера
│       │   ├── profile/        # Профиль + мои отзывы
│       │   ├── auth/vk/        # VK OAuth callback
│       │   ├── admin/          # Админ-панель
│       │   └── api/proxy/      # Прокси на backend
│       ├── components/
│       ├── context/AuthContext.tsx
│       └── lib/                # api.ts, types.ts, vkAuth.ts
├── nginx/conf.d/               # nginx конфиги для прода
├── docker-compose.yml
└── README.md
```

---

## Локальный запуск

**Требования:** Node 20+, PostgreSQL запущен локально.

### 1. Backend

```bash
cd backend
cp .env.example .env            # заполни DATABASE_URL, JWT_SECRET, VK_CLIENT_*
npm install
npx prisma migrate dev          # таблицы + client
npm run prisma:seed             # admin + тестовые данные
npm run start:dev               # http://localhost:4000
```

### 2. Frontend (новый терминал)

```bash
cd frontend
cp .env.local.example .env.local   # заполни NEXT_PUBLIC_VK_*
npm install
npm run dev                        # http://localhost:3000
```

> **VK OAuth локально не работает** — VK требует HTTPS в redirect_uri. Локально тестируется всё кроме логина; логин проверяется на проде.

Swagger: http://localhost:4000/api/docs.

---

## Git-workflow (разработка → прод)

### На локальной машине

```bash
# после правок
git add <файлы>
git commit -m "кратко суть"
git push
```

### На VPS

```bash
cd /opt/l2realm
git pull
docker compose up -d --build --force-recreate backend frontend
# nginx и postgres пересобирать не надо
```

**Важные нюансы:**
- Миграции Prisma применяются **автоматом** при старте backend (`prisma migrate deploy` в CMD Dockerfile).
- `NEXT_PUBLIC_*` переменные встраиваются в бандл **при билде** — после их изменения нужен `--build`.
- Если `docker compose up -d --build` говорит «up to date» и ничего не пересобирает — добавь `--force-recreate`.

### Проверка после деплоя

```bash
docker compose ps                                            # все Up
docker compose logs backend  | grep -iE "migration|запущен"  # миграция + Nest старт
docker compose logs frontend --tail=30                       # без ECONNREFUSED
```

---

## API (основное)

### Публичное
- `GET  /api/servers` — список с фильтрами (query: `chronicle`, `rates`, `donate`, `type`, `country`, `sort`, `page`)
- `GET  /api/servers/:id` — детали + отзывы + подписка
- `GET  /api/servers/stats` — агрегаты для главной
- `GET  /api/servers/coming-soon` — скоро открытие
- `POST /api/servers/request` — заявка на добавление
- `GET  /api/monitoring/:id` — текущий статус
- `GET  /api/monitoring/:id/daily?days=30` — аптайм по дням
- `GET  /api/reviews/server/:id` — отзывы сервера
- `POST /api/auth/vk/callback` — обмен VK-кода на JWT

### Требует JWT
- `GET   /api/auth/me` — текущий пользователь
- `PATCH /api/auth/nickname` — сменить никнейм
- `GET   /api/reviews/my` — мои отзывы
- `POST  /api/reviews/server/:id` — оставить отзыв
- `GET   /api/favorites` — мои избранные серверы (полные карточки)
- `GET   /api/favorites/ids` — только id (для быстрой проверки)
- `POST  /api/favorites/:serverId` — добавить в избранное
- `DELETE /api/favorites/:serverId` — убрать из избранного
- `POST  /api/payments/create` — создать платёж

### Admin (JWT + role=ADMIN)
- `POST /api/servers` / `PUT /api/servers/:id` / `DELETE /api/servers/:id`
- `GET  /api/servers/admin/requests` + `PUT .../status` + `DELETE`
- `GET  /api/reviews/pending` / `POST /api/reviews/:id/approve` / `DELETE`
- `GET  /api/payments/all` / `POST /api/payments/activate`

---

## Тарифы

| Тариф | Что даёт | Срок | Цена |
|-------|----------|------|------|
| FREE | Просто в списке | — | 0 ₽ |
| Стандарт | Выделение в списке | 31 день | 1 000 ₽/мес |
| Премиум | Закрепление вверху | 31 день | 3 500 ₽/мес |
| VIP | Отдельный блок + баннер | 31 день | 10 000 ₽/мес |

> Автоматический сброс на FREE по истечении (cron каждый час).

---

## Безопасность

- JWT 7 дней, bcrypt 12 rounds (для унаследованных пароль-аккаунтов)
- Новый вход — только через VK ID (PKCE, state-проверка)
- Максимум 2 аккаунта с одного IP при регистрации
- Админ-эндпоинты — через `@UseGuards(AuthGuard('jwt'))` + проверка роли
- Валидация DTO (class-validator, whitelist: true)
- SSL, SSH-keys only, fail2ban на VPS

---

## Что может пригодиться

- **Env-файлы** (`backend/.env`, `frontend/.env.local`) в git **не попадают** — только `.env.example`.
- **Бэкапы БД** на VPS — в `/opt/l2realm/backups/` (gzip, 7 дней).
- **Логи** — `docker compose logs -f <service>`.
- **Ручная миграция** (если понадобится): `docker compose exec backend npx prisma migrate deploy`.
- **Пересоздать конкретный контейнер** без остальных: `docker compose up -d --build --force-recreate <service>`.
