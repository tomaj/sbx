import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly ttl: number;
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    this.redis.on('error', (err) => {
      this.logger.warn(`Redis connection error: ${err.message}`);
    });

    this.ttl = config.get<number>('CACHE_TTL', 31536000);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await this.redis.getBuffer(key);
    } catch {
      return null; // graceful degradation when Redis is unavailable
    }
  }

  /**
   * @param key         Cache key
   * @param value       Image buffer
   * @param contentType MIME type stored alongside buffer (prefixed in cache)
   */
  async set(key: string, value: Buffer, contentType: string): Promise<void> {
    try {
      // Prefix the buffer with a fixed-length content-type header so we can
      // read it back without a separate key. Format: "<mime>\n<imageBytes>"
      const header = Buffer.from(`${contentType}\n`);
      await this.redis.setex(key, this.ttl, Buffer.concat([header, value]));
    } catch {
      // Cache write failure is non-fatal
    }
  }

  /**
   * Returns { buffer, contentType } extracted from the cached entry,
   * or null if the key doesn't exist or is malformed.
   */
  async getWithMime(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const raw = await this.get(key);
    if (!raw) return null;

    const sep = raw.indexOf(0x0a); // '\n'
    if (sep === -1) return null;

    const contentType = raw.slice(0, sep).toString('utf8');
    const buffer = raw.slice(sep + 1);
    return { buffer, contentType };
  }

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
