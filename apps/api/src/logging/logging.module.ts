import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string) ?? randomUUID(),
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
        // Don't log health check noise
        autoLogging: {
          ignore: (req: IncomingMessage) => req.url === '/health',
        },
      },
    }),
  ],
})
export class LoggingModule {}
