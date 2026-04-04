import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Allow cross-origin requests for CDN assets (images, files served to browsers)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3002);
}
bootstrap();
