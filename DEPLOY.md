# Деплой L2Realm на VPS

## Разовая настройка сервера

1. SSH:
   ```bash
   ssh root@<IP>
   ```

2. Клонировать репо:
   ```bash
   cd /opt && git clone https://github.com/ManaboRi/L2Realm l2realm && cd l2realm
   ```

3. Создать `.env`:
   ```bash
   cp .env.example .env && nano .env
   ```
   Заполнить `POSTGRES_PASSWORD`, `JWT_SECRET`, `FRONTEND_URL`.

4. Первый запуск (HTTP-only, для получения SSL):
   ```bash
   docker compose up -d --build
   ```

5. Получить SSL-сертификат:
   ```bash
   mkdir -p certbot/www certbot/conf
   docker run --rm \
     -v ./certbot/www:/var/www/certbot \
     -v ./certbot/conf:/etc/letsencrypt \
     certbot/certbot certonly --webroot -w /var/www/certbot \
     -d l2realm.ru -d www.l2realm.ru \
     --email your@email.com --agree-tos --non-interactive
   ```

6. Активировать HTTPS-конфиг nginx:
   ```bash
   cp nginx/ssl.conf nginx/conf.d/default.conf
   docker compose restart nginx
   ```

## Автообновление SSL (cron)

```bash
crontab -e
```

Добавить:
```
0 3 * * * cd /opt/l2realm && docker run --rm -v ./certbot/www:/var/www/certbot -v ./certbot/conf:/etc/letsencrypt certbot/certbot renew --quiet && docker compose restart nginx
```

## Обновление приложения

```bash
cd /opt/l2realm && git pull && docker compose up -d --build
```

## Импорт БД из Railway

```bash
# На локальной машине: снять дамп из Railway
pg_dump "<RAILWAY_DATABASE_URL>" > dump.sql

# Залить на сервер
scp dump.sql root@<IP>:/opt/l2realm/

# На сервере импортировать
cat dump.sql | docker compose exec -T postgres psql -U l2realm l2realm
```
