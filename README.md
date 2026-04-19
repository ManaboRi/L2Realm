# L2Realm — Каталог серверов Lineage 2

Полноценный full-stack веб-сайт на **Next.js + NestJS + PostgreSQL**.

## Стек
| Слой | Технология |
|------|-----------|
| Frontend | Next.js 16 (App Router, TypeScript) |
| Backend | NestJS 10 (TypeScript) |
| База данных | PostgreSQL 16 + Prisma ORM |
| Аутентификация | JWT (passport-jwt) |
| Оплата | ЮКасса |
| Email | Nodemailer (SMTP) |
| Деплой | Docker Compose (frontend + backend + postgres + nginx) |
| SSL | Let's Encrypt |

## Запуск локально

> PostgreSQL установлен локально. Убедись что сервис запущен перед стартом backend.

### 1. Backend
```bash
cd backend
npm install
npx prisma migrate dev     # создаёт / обновляет таблицы
npm run prisma:seed         # создаёт admin и тестовый сервер
npm run start:dev           # API на http://localhost:4000
```

### 2. Frontend (в другом терминале)
```bash
cd frontend
npm run dev                 # сайт на http://localhost:3000
```

## Структура проекта
```
L21Realm/
├── backend/
│   ├── src/
│   │   ├── auth/         # JWT, сброс пароля, IP-защита
│   │   ├── servers/      # CRUD серверов + фильтры
│   │   ├── reviews/      # Отзывы + рейтинг (1 аккаунт = 1 отзыв)
│   │   ├── monitoring/   # Пинг серверов каждые 5 мин, аптайм-граф
│   │   ├── payments/     # ЮКасса + авто-сброс тарифа через 31 день
│   │   └── prisma/       # Prisma клиент
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── frontend/
│   └── src/app/
│       ├── page.tsx              # Главная — каталог
│       ├── servers/[id]/         # Страница сервера (аптайм-граф)
│       ├── admin/                # Админ-панель (Серверы, Отзывы, Добавить)
│       ├── forgot-password/      # Запрос сброса пароля
│       └── reset-password/       # Форма нового пароля (по токену из email)
└── package.json
```

## API Endpoints

### Публичные
- `GET  /api/servers` — список с фильтрами
- `GET  /api/servers/:id` — детали сервера
- `GET  /api/monitoring/:id` — статус сервера
- `GET  /api/monitoring/:id/daily?days=30` — аптайм по дням (для графика)
- `POST /api/auth/login` / `POST /api/auth/register`
- `POST /api/auth/forgot-password` — запрос ссылки сброса
- `POST /api/auth/reset-password` — сброс пароля по токену
- `POST /api/payments/create` — создать платёж ЮКасса

### Admin (Bearer JWT с ролью ADMIN)
- `POST /api/servers` — добавить сервер
- `PUT  /api/servers/:id` — обновить
- `DELETE /api/servers/:id` — удалить
- `GET  /api/reviews/pending` — отзывы на модерации
- `POST /api/reviews/:id/approve` — одобрить отзыв
- `POST /api/payments/activate` — ручная активация тарифа

## Swagger
После запуска backend: **http://localhost:4000/api/docs**

## Email (сброс пароля)
Настраивается через `.env` в backend:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```
> Без SMTP-настроек ссылка сброса **выводится в консоль backend** — удобно при разработке.

## Тарифы
| Тариф | Что даёт | Срок | Цена |
|-------|---------|------|------|
| FREE | Просто в списке | — | 0 ₽ |
| Стандарт | Выделение в списке | 31 день | 1 000 ₽/мес |
| Премиум | Закрепление вверху | 31 день | 3 500 ₽/мес |
| VIP | Отдельный блок + баннер | 31 день | 10 000 ₽/мес |

> Тарифы автоматически сбрасываются на FREE по истечении срока (cron каждый час).

## Безопасность
- JWT 7 дней, bcrypt hash (12 rounds)
- Сброс пароля через email — токен действует 1 час, после использования сгорает
- Максимум 2 аккаунта с одного IP при регистрации
- 1 аккаунт = 1 отзыв на сервер (редактирование разрешено)
- Роль ADMIN: полный доступ к управлению

## Деплой
Прод крутится на VPS через Docker Compose: `postgres` + `backend` + `frontend` + `nginx`.
Подробности и креды — в приватной заметке (не в репозитории).

Обновление прода:
```bash
git pull
docker compose build <service>
docker compose up -d <service>
```
