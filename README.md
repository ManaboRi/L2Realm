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

### Монетизация
- [x] **VIP** — 3 слота, 5 000 ₽ / 31 день. Отдельный блок на главной, золотая обводка. Когда мест нет — видна дата ближайшего освобождения.
- [x] **Буст 🔥** — 250 ₽ / 7 дней. Поднимает сервер выше обычных в каталоге, анимация огонька. Продление суммируется.
- [x] **Сервер дня ★** — бесплатно. Случайный сервер (детерминированно по дате), подсвечивается изумрудом. В пуле только не-VIP и не-забустенные серверы.
- [x] Публичная страница `/pricing` (SEO + покупка) + пункт в шапке
- [x] Размещение в каталоге — всегда бесплатное, с модерацией заявок админом
- [x] ЮКасса: покупка через `POST /api/payments/purchase` (требует JWT — email идёт в чек по 54-ФЗ). В dev-mode (`NODE_ENV≠production` + пустые ключи) активируется автоматически, в проде — ошибка.
- [x] Webhook `POST /api/payments/webhook` фильтрует source IP по whitelist ЮКассы
- [x] Авто-сброс VIP на FREE по истечении (cron)
- [x] Страница `/legal` — публичная оферта + реквизиты исполнителя (для анкеты ЮКассы)

### Админ-панель
- [x] CRUD серверов + статус (VIP/Буст/SoD) прямо в таблице
- [x] Модерация отзывов
- [x] Модерация заявок на добавление
- [x] Вкладка «Монетизация»: 3 VIP-слота с датами окончания и кнопкой «Снять», таблица активных/истёкших бустов, ручная выдача VIP/буста любому серверу, инфо-карточка «Сервер дня сегодня»

### Telegram-бот
- [x] Парсинг новостей из каналов серверов → в ленту сервера

### Мобильная адаптация
- [x] Шапка: адаптивный чип профиля, короткая «+» кнопка, меню-ссылки скрыты на телефоне
- [x] Главная: фильтры-сайдбар становятся сворачиваемым блоком (toggle-кнопка + счётчик активных фильтров), hero/поиск/сортировка стекаются
- [x] Страница сервера: баннер 140px, иконка 54px, заголовок колонкой, inline-toasts по ширине
- [x] Профиль: paddings/аватар через `clamp()`, карточки дышат на малых экранах
- [x] `/add` и `/admin`: плотнее отступы, 1-колоночные поля форм, таблица админки прокручивается горизонтально
- [x] `viewport` theme-color для мобильных браузеров (`#090B10`)

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
- `POST /api/payments/purchase` — купить VIP или буст (`{ kind, serverId, returnUrl }`). Email плательщика берётся из JWT и уходит в чек ЮКассы.
- `GET  /api/payments/vip/status` — занято VIP-мест, ближайшая дата освобождения
- `GET  /api/payments/boosts/active` — активные бусты (для сортировки клиента при нужде)

### Webhook (без JWT, но с IP-whitelist)
- `POST /api/payments/webhook` — уведомление от ЮКассы о смене статуса платежа. Source IP проверяется по [списку ЮКассы](https://yookassa.ru/developers/using-api/webhooks#ip); чужие вызовы получают 403.

### Admin (JWT + role=ADMIN)
- `POST /api/servers` / `PUT /api/servers/:id` / `DELETE /api/servers/:id`
- `GET  /api/servers/admin/requests` + `PUT .../status` + `DELETE`
- `GET  /api/reviews/pending` / `POST /api/reviews/:id/approve` / `DELETE`
- `GET  /api/payments/all` — все подписки
- `GET  /api/payments/boosts/all` — все бусты
- `POST|DELETE /api/payments/vip/:serverId` — ручная выдача/снятие VIP
- `POST|DELETE /api/payments/boost/:serverId` — ручная выдача/снятие буста

---

## Тарифы

| Продукт | Что даёт | Срок | Цена | Условие |
|---------|----------|------|------|---------|
| FREE | Размещение в каталоге | — | 0 ₽ | По модерации |
| 🔥 Буст | Поднять над обычными + огонёк и анимация | 7 дней | 250 ₽ | Покупка в любой момент, продление суммируется |
| ◆ VIP | Отдельный блок «VIP Серверы» на главной, золотая обводка | 31 день | 5 000 ₽ | Всего 3 места, FIFO |
| ★ Сервер дня | Случайный из пула без VIP/буста, изумрудная подсветка | 24 ч | Бесплатно | Автоматически раз в сутки |

> VIP → по истечении сервер возвращается во FREE (cron). Буст не продляется автоматически.
> Выбор «Сервера дня» — детерминированный (сид по дате UTC), без отдельной таблицы.

---

## Подключение ЮКассы

**Анкета магазина ЮКассы** — на сайте нужны:
- Тарифы с ценами и описанием → [`/pricing`](frontend/src/app/pricing/page.tsx)
- Оферта + реквизиты (ФИО, ИНН самозанятого, контакты) → [`/legal`](frontend/src/app/legal/page.tsx)
- Футер со ссылкой на оферту на всех страницах → [`Footer.tsx`](frontend/src/components/Footer.tsx)

В поле «Ссылка на страницу с реквизитами» → `https://l2realm.ru/legal`.

**После одобрения** в ЛК ЮКассы:
1. **Настройки → API** → скопировать `shopId` и `secretKey` (`live_...`)
2. В `/opt/l2realm/backend/.env` прописать:
   ```env
   YOOKASSA_SHOP_ID="123456"
   YOOKASSA_SECRET_KEY="live_..."
   NODE_ENV="production"
   ```
3. `docker compose restart backend`
4. **Настройки → HTTP-уведомления** → URL: `https://l2realm.ru/api/proxy/payments/webhook`, событие `payment.succeeded` (+ опционально `payment.canceled`, `refund.succeeded`)
5. **Чеки** → включить фискализацию через интеграцию с «Мой налог» (для самозанятого)

**Как работает:**
- Юзер логинится (VK ID) → на `/pricing` выбирает сервер → нажимает «Купить»
- Фронт шлёт `POST /api/payments/purchase` с JWT → бэк вытаскивает email из токена, создаёт платёж в ЮКассе с `receipt` (обязательно для 54-ФЗ)
- ЮКасса возвращает `confirmationUrl` → фронт редиректит на страницу оплаты
- После успеха ЮКасса шлёт webhook на `/payments/webhook` → бэк проверяет source IP, активирует VIP/буст

**IP-whitelist ЮКассы** зашит в [`payments.service.ts`](backend/src/payments/payments.service.ts) (`YOOKASSA_IP_RANGES`). Если ЮКасса добавит новые — [обновить список](https://yookassa.ru/developers/using-api/webhooks#ip).

---

## Безопасность

- JWT 7 дней, bcrypt 12 rounds (для унаследованных пароль-аккаунтов)
- Новый вход — только через VK ID (PKCE, state-проверка)
- Максимум 2 аккаунта с одного IP при регистрации
- Админ-эндпоинты — через `@UseGuards(AuthGuard('jwt'))` + проверка роли
- `/payments/purchase` — за JWT (email из токена уходит в чек, плательщик всегда идентифицирован)
- `/payments/webhook` — IP-whitelist ЮКассы; без ключей ЮКассы в проде активация запрещена
- Валидация DTO (class-validator, whitelist: true)
- SSL, SSH-keys only, fail2ban на VPS

### Что НЕ должно попадать в git
- `backend/.env` и `frontend/.env.local` — `.gitignore` их ловит, но всегда перепроверяй перед `git add -A`
- `YOOKASSA_SECRET_KEY`, `JWT_SECRET`, `VK_CLIENT_SECRET`, `ADMIN_PASS` — только в `.env` на VPS
- Дампы БД (`*.sql`, `*.dump`) и бэкапы — только локально и на VPS в `backups/`

---

## Что может пригодиться

- **Env-файлы** (`backend/.env`, `frontend/.env.local`) в git **не попадают** — только `.env.example`.
- **Бэкапы БД** на VPS — в `/opt/l2realm/backups/` (gzip, 7 дней).
- **Логи** — `docker compose logs -f <service>`.
- **Ручная миграция** (если понадобится): `docker compose exec backend npx prisma migrate deploy`.
- **Пересоздать конкретный контейнер** без остальных: `docker compose up -d --build --force-recreate <service>`.
