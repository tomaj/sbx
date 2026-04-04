import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { validateEnv } from './config/env.schema';

// BigInt serialization: safe integers as Number, larger values as String
(BigInt.prototype as any).toJSON = function () {
  const n = Number(this);
  return Number.isSafeInteger(n) ? n : this.toString();
};

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);

  app.use(compression());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // 'unsafe-inline' intentionally omitted — API serves JSON, not HTML pages
          // The field-types plugin HTML endpoint overrides this CSP per-response since it needs inline scripts
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  const allowedOrigins = [
    // Localhost origins only in development — never exposed in production
    ...(env.NODE_ENV === 'development' ? ['http://localhost:3001', 'http://localhost:3003'] : []),
    ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()) : []),
  ];
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger UI — only in development
  if (env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('SBX API')
      .setDescription('SBX Management API + CDN API')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer' }, 'session')
      .addApiKey({ type: 'apiKey', in: 'query', name: 'token' }, 'cdn-token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(env.PORT);
}
bootstrap();
