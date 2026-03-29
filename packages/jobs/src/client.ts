import { Queue, JobsOptions } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { WEBHOOKS_QUEUE, WebhookDispatchJobData } from './queues/webhooks';
import { STORIES_QUEUE, StoryPublishJobData, StoryExpireJobData } from './queues/stories';
import { RELEASES_QUEUE, ReleaseExecuteJobData } from './queues/releases';
import { EMAILS_QUEUE, EmailJobData } from './queues/emails';
import { WORKFLOW_EVENTS_QUEUE, WorkflowEventJobData } from './queues/workflow-events';

export class JobsClient {
  private queues = new Map<string, Queue>();

  constructor(private readonly connection: ConnectionOptions) {}

  // ─── Webhooks ─────────────────────────────────────────────────────────────

  readonly webhooks = {
    dispatch: (data: WebhookDispatchJobData, opts?: JobsOptions) =>
      this.add(WEBHOOKS_QUEUE, 'dispatch', data, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
        ...opts,
      }),
  };

  // ─── Stories ──────────────────────────────────────────────────────────────

  readonly stories = {
    schedulePublish: (data: StoryPublishJobData, delayMs: number) =>
      this.add(STORIES_QUEUE, 'publish', data, {
        delay: delayMs,
        jobId: `story-publish-${data.storyId}`,
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      }),

    cancelPublish: async (storyId: string) => {
      const q = this.getQueue(STORIES_QUEUE);
      const job = await q.getJob(`story-publish-${storyId}`);
      await job?.remove();
    },

    scheduleExpire: (data: StoryExpireJobData, delayMs: number) =>
      this.add(STORIES_QUEUE, 'expire', data, {
        delay: delayMs,
        jobId: `story-expire-${data.storyId}`,
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      }),

    cancelExpire: async (storyId: string) => {
      const q = this.getQueue(STORIES_QUEUE);
      const job = await q.getJob(`story-expire-${storyId}`);
      await job?.remove();
    },

    // For the cron fallback — immediate publish/expire without delay
    publishNow: (data: StoryPublishJobData) =>
      this.add(STORIES_QUEUE, 'publish', data, {
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      }),

    expireNow: (data: StoryExpireJobData) =>
      this.add(STORIES_QUEUE, 'expire', data, {
        removeOnComplete: true,
        removeOnFail: { count: 100 },
      }),
  };

  // ─── Releases ─────────────────────────────────────────────────────────────

  readonly releases = {
    execute: (data: ReleaseExecuteJobData, opts?: JobsOptions) =>
      this.add(RELEASES_QUEUE, 'execute', data, {
        jobId: `release-execute-${data.releaseId}`,
        removeOnComplete: true,
        removeOnFail: { count: 100 },
        ...opts,
      }),

    cancelExecute: async (releaseId: number) => {
      const q = this.getQueue(RELEASES_QUEUE);
      const job = await q.getJob(`release-execute-${releaseId}`);
      await job?.remove();
    },
  };

  // ─── Emails ───────────────────────────────────────────────────────────────

  readonly emails = {
    send: (data: EmailJobData, opts?: JobsOptions) =>
      this.add(EMAILS_QUEUE, data.type, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
        ...opts,
      }),
  };

  // ─── Workflow events ──────────────────────────────────────────────────────

  readonly workflowEvents = {
    emit: (data: WorkflowEventJobData, opts?: JobsOptions) =>
      this.add(WORKFLOW_EVENTS_QUEUE, data.event, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
        ...opts,
      }),
  };

  // ─── Internal ─────────────────────────────────────────────────────────────

  private add(queue: string, name: string, data: unknown, opts?: JobsOptions) {
    return this.getQueue(queue).add(name, data, opts);
  }

  private getQueue(name: string): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async close() {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
