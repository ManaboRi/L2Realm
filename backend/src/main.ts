import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — разрешаем фронтенд (локально + Railway + домен)
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim());
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some(o => origin.startsWith(o))) cb(null, true);
      else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Глобальная валидация DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Prefix для всех роутов
  app.setGlobalPrefix('api');

  // Swagger документация
  const config = new DocumentBuilder()
    .setTitle('L2Realm API')
    .setDescription('API каталога серверов Lineage 2')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 L2Realm API запущен на http://localhost:${port}/api`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
