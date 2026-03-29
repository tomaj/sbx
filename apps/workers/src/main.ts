import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const port = parseInt(process.env.PORT ?? '3004');
  await app.listen(port);

  console.log(`Workers running on http://localhost:${port}`);
  console.log(`Bull Board UI: http://localhost:${port}/ui`);
}

bootstrap();
