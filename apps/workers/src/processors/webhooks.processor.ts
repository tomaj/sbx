import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { WEBHOOKS_QUEUE } from '@sbx/jobs';
import type { WebhookDispatchJobData } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import type { DbType } from '../db/db.module.js';
import { webhookLogs } from '../db/schema.js';

@Processor(WEBHOOKS_QUEUE, { concurrency: 10 })
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(@Inject(DB) private db: DbType) {
    super();
  }

  async process(job: Job<WebhookDispatchJobData>): Promise<void> {
    const { webhookEndpointId, spaceId, endpoint, secret, action, payload } = job.data;

    this.logger.debug(`Dispatching webhook ${webhookEndpointId} action=${action}`);

    let status = 'failed';
    let responseBody: string | null = null;
    let responseStatus: number | null = null;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'Webhook-Secret': secret } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      responseStatus = res.status;
      responseBody = await res.text().catch(() => null);
      status = res.ok ? 'success' : 'failed';
    } catch (err) {
      this.logger.warn(`Webhook ${webhookEndpointId} failed: ${(err as Error).message}`);
      // Re-throw so BullMQ retries with backoff
      throw err;
    } finally {
      await this.db.insert(webhookLogs).values({
        webhookEndpointId,
        spaceId,
        action,
        status,
        requestBody: payload as any,
        responseBody,
        responseStatus,
        executedAt: new Date(),
      });
    }

    if (status === 'failed') {
      throw new Error(`Webhook returned HTTP ${responseStatus}`);
    }

    this.logger.log(`Webhook ${webhookEndpointId} delivered (${responseStatus})`);
  }
}
