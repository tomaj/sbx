import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, type HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { RateLimit } from '../throttler/throttler.module';
import { DbHealthIndicator } from './db.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('Health')
@RateLimit('none')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private dbHealth: DbHealthIndicator,
    private redisHealth: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.dbHealth.isHealthy('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @Get('liveness')
  liveness() {
    return { status: 'ok' };
  }
}
