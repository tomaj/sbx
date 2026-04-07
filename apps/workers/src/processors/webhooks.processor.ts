import { createHmac } from 'crypto';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WEBHOOKS_QUEUE } from '@sbx/jobs';
import { WebhookDispatchJobData } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import { DbType } from '../db/db.module.js';
import { webhookLogs } from '../db/schema.js';

@Processor(WEBHOOKS_QUEUE, { concurrency: 10 })
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(@Inject(DB) private db: DbType) {
    super();
  }

  async process(job: Job<WebhookDispatchJobData>): Promise<void> {
    const { webhookEndpointId, spaceId, endpoint, secret, action, payload } = job.data;
    const maxAttempts = job.opts.attempts ?? 1;
    const isFinalAttempt = job.attemptsMade + 1 >= maxAttempts;

    this.logger.debug(
      `Dispatching webhook ${webhookEndpointId} action=${action} attempt=${job.attemptsMade + 1}/${maxAttempts}`,
    );

    let status = 'failed';
    let responseBody: string | null = null;
    let responseStatus: number | null = null;
    let dispatchError: Error | null = null;

    try {
      const bodyStr = JSON.stringify(payload);

      // Build signing headers when a secret is configured
      const signingHeaders: Record<string, string> = {};
      if (secret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = createHmac('sha256', secret)
          .update(`${timestamp}.${bodyStr}`)
          .digest('hex');

        signingHeaders['X-Webhook-Signature'] = `sha256=${signature}`;
        signingHeaders['X-Webhook-Timestamp'] = String(timestamp);
        // Deprecated: kept for backwards compatibility with consumers that
        // still verify the plaintext secret header. Will be removed in a
        // future release — migrate to X-Webhook-Signature HMAC verification.
        signingHeaders['Webhook-Secret'] = secret;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...signingHeaders,
        },
        body: bodyStr,
        signal: AbortSignal.timeout(15_000),
      });

      responseStatus = res.status;
      responseBody = await res.text().catch(() => null);
      status = res.ok ? 'success' : 'failed';
    } catch (err) {
      dispatchError = err as Error;
      this.logger.warn(`Webhook ${webhookEndpointId} failed: ${dispatchError.message}`);
    }

    // Log to DB only on success or on the final failed attempt to avoid
    // creating a separate webhook_log row for each intermediate retry.
    if (status === 'success' || isFinalAttempt) {
      await this.db.insert(webhookLogs).values({
        webhookEndpointId,
        spaceId,
        action,
        status,
        requestBody: payload,
        responseBody,
        responseStatus,
        executedAt: new Date(),
      });
    }

    if (dispatchError) {
      throw dispatchError;
    }

    if (status === 'failed') {
      throw new Error(`Webhook returned HTTP ${responseStatus}`);
    }

    this.logger.log(`Webhook ${webhookEndpointId} delivered (${responseStatus})`);
  }
}
