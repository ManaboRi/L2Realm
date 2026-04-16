FROM node:18-alpine
WORKDIR /app

# Копируем package.json и prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем ВСЕ зависимости (без ограничений NODE_ENV)
RUN npm install

# Копируем исходный код
COPY . .

# Собираем TypeScript в dist/
RUN npm run build

# Удаляем devDependencies после сборки (уменьшаем размер образа)
RUN npm prune --omit=dev

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
