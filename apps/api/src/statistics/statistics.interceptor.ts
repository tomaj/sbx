import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StatisticsService } from './statistics.service';

interface RequestWithStats {
  params?: { spaceId?: string };
  method?: string;
  url?: string;
  user?: { id?: number };
  token?: { type?: string };
}

/**
 * Logs every MAPI/Admin request that targets a specific space:
 *  - detailed row in api_request_logs (path, user, status, duration)
 *  - daily aggregate UPSERT in statistics
 * Everything runs fire-and-forget after the response is sent.
 */
@Injectable()
export class StatisticsInterceptor implements NestInterceptor {
  constructor(private readonly statisticsService: StatisticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithStats>();
    const rawId = req.params?.spaceId;
    if (!rawId) return next.handle();

    const spaceId = parseInt(rawId, 10);
    if (isNaN(spaceId)) return next.handle();

    const startedAt = Date.now();
    const method = req.method ?? 'GET';
    const path = req.url ?? '';

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<{ statusCode?: number }>();
          const statusCode = res.statusCode ?? null;
          const responseTimeMs = Date.now() - startedAt;
          const userId = req.user?.id ?? null;
          const tokenType = req.token?.type ?? null;

          this.statisticsService
            .logRequest({ spaceId, userId, method, path, statusCode, responseTimeMs, tokenType })
            .catch(() => {});
          this.statisticsService.increment(spaceId).catch(() => {});
        },
        error: () => {
          const responseTimeMs = Date.now() - startedAt;
          this.statisticsService
            .logRequest({ spaceId, method, path, statusCode: 500, responseTimeMs })
            .catch(() => {});
          this.statisticsService.increment(spaceId).catch(() => {});
        },
      }),
    );
  }
}
