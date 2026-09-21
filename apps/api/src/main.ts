import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Схема описана только для transactions; остальные модули добавятся по мере разметки.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Expense Tracker API')
    .setDescription('Трекер личных расходов. Все маршруты, кроме auth, требуют Bearer-токен.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  // Путь абсолютный: setGlobalPrefix на Swagger UI не распространяется.
  SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>('PORT', 4000);
  await app.listen(port);
  console.log(`API слушает http://localhost:${port}/api`);
  console.log(`Swagger UI — http://localhost:${port}/api/docs`);
}

void bootstrap();
