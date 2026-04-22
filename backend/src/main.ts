import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // За nginx/traefik: доверяем только 1 прокси впереди, иначе X-Forwarded-For можно спуфить
  app.set('trust proxy', 1);

  // Security headers (CSP отключаем — Next.js уже отдаёт свой, дублирование только мешает)
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProd ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false,
  }));

  // CORS — только явно разрешённые origin (прод-домен + локалка)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true);
      else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Глобальная валидация DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  // Prefix для всех роутов
  app.setGlobalPrefix('api');

  // Swagger — только в dev. В проде не раскрываем карту endpoints.
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('L2Realm API')
      .setDescription('API каталога серверов Lineage 2')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Скрываем технический заголовок «X-Powered-By: Express»
  app.disable('x-powered-by');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 L2Realm API запущен на порту ${port} (NODE_ENV=${process.env.NODE_ENV || 'dev'})`);
  if (!isProd) console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
