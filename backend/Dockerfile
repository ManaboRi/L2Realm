FROM node:18-slim
WORKDIR /app

# Замена Debian mirror на Яндекс (deb.debian.org недоступен из РФ)
RUN sed -i 's|http://deb.debian.org|http://mirror.yandex.ru|g; s|http://security.debian.org|http://mirror.yandex.ru|g' /etc/apt/sources.list.d/debian.sources

# Устанавливаем OpenSSL — нужен для Prisma binary engine на Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Копируем package.json и prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем ВСЕ зависимости + генерируем Prisma клиент
RUN npm install

# Явно генерируем Prisma клиент с правильным бинарником
RUN npx prisma generate

# Копируем исходный код
COPY . .

# Собираем TypeScript в dist/
RUN npm run build

# Удаляем devDependencies после сборки
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
