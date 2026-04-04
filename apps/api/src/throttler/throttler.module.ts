import { Module } from '@nestjs/common';
import { ThrottlerModule as NestThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

export { RateLimit } from './rate-limit.decorator';

@Module({
  imports: [
    NestThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second window
        limit: 20, // 20 requests per second (global default)
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute window
        limit: 200, // 200 requests per minute (global default)
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ThrottlerModule {}
