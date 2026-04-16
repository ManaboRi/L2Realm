FROM node:18-slim
WORKDIR /app

# Копируем package.json и prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем ВСЕ зависимости
RUN npm install

# Генерируем Prisma клиент
RUN npx prisma generate

# Копируем исходный код
COPY . .

# Собираем TypeScript в dist/
RUN npm run build

# Удаляем devDependencies после сборки
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
