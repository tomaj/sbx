import { Global, Module } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ENV } from '../config/config.module';
import type { Env } from '../config/env.schema';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env) =>
        new Redis({
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          password: env.REDIS_PASSWORD || undefined,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
