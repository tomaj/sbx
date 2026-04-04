import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from './app.module.js';

function makeBullBoardAuth(jwtService: JwtService) {
  return function bullBoardAuth(req: Request, res: Response, next: NextFunction) {
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(/sbx\.session=([^;]+)/);
    const token = match?.[1];

    if (token) {
      try {
        jwtService.verify(token);
        return next();
      } catch {
        // invalid token — fall through to 401
      }
    }

    res.setHeader('WWW-Authenticate', 'Bearer realm="Bull Board"');
    res.status(401).send('Unauthorized');
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  // Protect Bull Board UI with JWT cookie (sbx.session from admin)
  const jwtService = new JwtService({ secret: process.env.JWT_SECRET ?? '' });
  app.use('/ui', makeBullBoardAuth(jwtService));

  app.enableShutdownHooks();

  const port = parseInt(process.env.PORT ?? '3004', 10);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`Workers running on http://localhost:${port}`, 'Bootstrap');
  logger.log(`Bull Board UI: http://localhost:${port}/ui`, 'Bootstrap');
}

bootstrap();
