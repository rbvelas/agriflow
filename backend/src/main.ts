import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Validación global de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — permite el frontend Next.js en dev y producción
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      /\.vercel\.app$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);

  Logger.log(`🌾 AgriFlow Backend → http://localhost:${port}`, 'Bootstrap');
  Logger.log(`🔗 tRPC endpoint   → http://localhost:${port}/trpc`, 'Bootstrap');
  Logger.log(`🔔 n8n webhooks    → http://localhost:${port}/api/webhooks/n8n`, 'Bootstrap');
}

bootstrap();
