import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { RELEASES_QUEUE } from '@sbx/jobs';
import { ReleaseExecuteJobData, JobsClient } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import { DbType } from '../db/db.module.js';
import { releases, users } from '../db/schema.js';
import { JOBS_CLIENT } from '../jobs.provider.js';

@Processor(RELEASES_QUEUE, { concurrency: 2 })
export class ReleasesProcessor extends WorkerHost {
  private readonly logger = new Logger(ReleasesProcessor.name);

  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {
    super();
  }

  async process(job: Job<ReleaseExecuteJobData>): Promise<void> {
    const { releaseId, spaceId } = job.data;

    const [release] = await this.db
      .select()
      .from(releases)
      .where(eq(releases.id, releaseId))
      .limit(1);

    if (!release) {
      this.logger.warn(`Release ${releaseId} not found`);
      return;
    }

    if (release.released) {
      this.logger.debug(`Release ${releaseId} already released`);
      return;
    }

    // Mark as released
    await this.db
      .update(releases)
      .set({ released: true, updatedAt: new Date() })
      .where(eq(releases.id, releaseId));

    this.logger.log(`Executed release ${releaseId} "${release.name}" (spaceId=${spaceId})`);

    // Notify users
    const userIds = release.usersToNotifyIds as number[];
    if (userIds.length > 0) {
      for (const userId of userIds) {
        const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

        if (user) {
          await this.jobs.emails.send({
            type: 'release-notification',
            to: user.email,
            releaseName: release.name,
            releaseAt: release.releaseAt?.toISOString() ?? new Date().toISOString(),
            spaceId,
          });
        }
      }
    }
  }
}
