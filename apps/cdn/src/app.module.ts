import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AssetModule } from './asset/asset.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limit image transformation: 60 requests per 10 seconds per IP
    // Prevents CPU abuse via Sharp (resize/blur/convert operations)
    ThrottlerModule.forRoot([{ ttl: 10000, limit: 60 }]),
    AssetModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
