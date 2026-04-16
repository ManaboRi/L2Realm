FROM node:20-slim
WORKDIR /app

COPY package*.json ./

# Устанавливаем ВСЕ зависимости (typescript нужен для next build)
RUN npm install

COPY . .

# NEXT_PUBLIC_* переменные встраиваются в bundle при сборке
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000

ENV HOSTNAME=0.0.0.0

CMD ["npm", "run", "start"]
