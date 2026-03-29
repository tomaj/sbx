import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { STORIES_QUEUE, JobsClient } from '@sbx/jobs';
import type { StoryPublishJobData, StoryExpireJobData } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import type { DbType } from '../db/db.module.js';
import { stories, spaces, webhookEndpoints } from '../db/schema.js';
import { JOBS_CLIENT } from '../jobs.provider.js';

@Processor(STORIES_QUEUE, { concurrency: 5 })
export class StorySchedulerProcessor extends WorkerHost {
  private readonly logger = new Logger(StorySchedulerProcessor.name);

  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {
    super();
  }

  async process(job: Job<StoryPublishJobData | StoryExpireJobData>): Promise<void> {
    if (job.name === 'publish') {
      await this.publishStory(job.data as StoryPublishJobData);
    } else if (job.name === 'expire') {
      await this.expireStory(job.data as StoryExpireJobData);
    }
  }

  private async publishStory(data: StoryPublishJobData) {
    const { storyId, spaceId } = data;

    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);

    if (!story) {
      this.logger.warn(`Story ${storyId} not found, skipping publish`);
      return;
    }

    if (story.published && !story.unpublishedChanges) {
      this.logger.debug(`Story ${storyId} already published, skipping`);
      return;
    }

    const now = new Date();

    await this.db
      .update(stories)
      .set({
        published: true,
        unpublishedChanges: false,
        publishedAt: now,
        firstPublishedAt: story.firstPublishedAt ?? now,
        publishAt: null,
        updatedAt: now,
      })
      .where(eq(stories.id, BigInt(storyId)));

    // Bump space cache version
    await this.db
      .update(spaces)
      .set({ version: Date.now() })
      .where(eq(spaces.id, spaceId));

    this.logger.log(`Published story ${storyId} (spaceId=${spaceId})`);

    await this.dispatchWebhooks(spaceId, 'story.published', {
      story_id: storyId,
      space_id: spaceId,
      action: 'published',
    });

    await this.jobs.workflowEvents.emit({
      event: 'story-published',
      storyId,
      spaceId,
      actorId: null,
    });
  }

  private async expireStory(data: StoryExpireJobData) {
    const { storyId, spaceId } = data;

    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId), isNull(stories.deletedAt)))
      .limit(1);

    if (!story || !story.published) {
      this.logger.debug(`Story ${storyId} not published, skipping expire`);
      return;
    }

    await this.db
      .update(stories)
      .set({
        published: false,
        unpublishedChanges: true,
        expireAt: null,
        updatedAt: new Date(),
      })
      .where(eq(stories.id, BigInt(storyId)));

    await this.db
      .update(spaces)
      .set({ version: Date.now() })
      .where(eq(spaces.id, spaceId));

    this.logger.log(`Expired story ${storyId} (spaceId=${spaceId})`);

    await this.dispatchWebhooks(spaceId, 'story.unpublished', {
      story_id: storyId,
      space_id: spaceId,
      action: 'unpublished',
    });
  }

  private async dispatchWebhooks(spaceId: number, action: string, payload: Record<string, unknown>) {
    const endpoints = await this.db
      .select()
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.spaceId, spaceId), eq(webhookEndpoints.activated, true), isNull(webhookEndpoints.deletedAt)));

    for (const endpoint of endpoints) {
      const actions = endpoint.actions as string[];
      if (!actions.includes(action)) continue;

      await this.jobs.webhooks.dispatch({
        spaceId,
        webhookEndpointId: endpoint.id,
        endpoint: endpoint.endpoint,
        secret: endpoint.secret ?? null,
        action,
        payload,
      });
    }
  }
}
