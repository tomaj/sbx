import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNull, isNotNull, lte } from 'drizzle-orm';
import { JobsClient } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import type { DbType } from '../db/db.module.js';
import { stories, releases } from '../db/schema.js';
import { JOBS_CLIENT } from '../jobs.provider.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {}

  // ─── Story publish fallback (every minute) ────────────────────────────────
  // Catches stories whose delayed BullMQ job was lost (Redis restart, etc.)

  @Cron('* * * * *')
  async checkScheduledPublishes() {
    const now = new Date();

    const due = await this.db
      .select({ id: stories.id, spaceId: stories.spaceId })
      .from(stories)
      .where(
        and(
          eq(stories.published, false),
          isNotNull(stories.publishAt),
          lte(stories.publishAt, now),
          isNull(stories.deletedAt),
        ),
      );

    for (const story of due) {
      await this.jobs.stories.publishNow({
        storyId: story.id.toString(),
        spaceId: story.spaceId,
      });
    }

    if (due.length > 0) {
      this.logger.log(`Enqueued ${due.length} overdue story publish(es)`);
    }
  }

  // ─── Story expire fallback (every minute) ─────────────────────────────────

  @Cron('* * * * *')
  async checkScheduledExpires() {
    const now = new Date();

    const due = await this.db
      .select({ id: stories.id, spaceId: stories.spaceId })
      .from(stories)
      .where(
        and(
          eq(stories.published, true),
          isNotNull(stories.expireAt),
          lte(stories.expireAt, now),
          isNull(stories.deletedAt),
        ),
      );

    for (const story of due) {
      await this.jobs.stories.expireNow({
        storyId: story.id.toString(),
        spaceId: story.spaceId,
      });
    }

    if (due.length > 0) {
      this.logger.log(`Enqueued ${due.length} overdue story expire(s)`);
    }
  }

  // ─── Release execute fallback (every minute) ──────────────────────────────

  @Cron('* * * * *')
  async checkScheduledReleases() {
    const now = new Date();

    const due = await this.db
      .select({ id: releases.id, spaceId: releases.spaceId })
      .from(releases)
      .where(
        and(
          eq(releases.released, false),
          isNotNull(releases.releaseAt),
          lte(releases.releaseAt, now),
        ),
      );

    for (const release of due) {
      await this.jobs.releases.execute({
        releaseId: release.id,
        spaceId: release.spaceId,
      });
    }

    if (due.length > 0) {
      this.logger.log(`Enqueued ${due.length} overdue release(s)`);
    }
  }
}
