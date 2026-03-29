import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { WORKFLOW_EVENTS_QUEUE, JobsClient } from '@sbx/jobs';
import type { WorkflowEventJobData } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import type { DbType } from '../db/db.module.js';
import { users, stories, workflowStages, approvals } from '../db/schema.js';
import { JOBS_CLIENT } from '../jobs.provider.js';

@Processor(WORKFLOW_EVENTS_QUEUE, { concurrency: 5 })
export class WorkflowEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowEventsProcessor.name);

  constructor(
    @Inject(DB) private db: DbType,
    @Inject(JOBS_CLIENT) private jobs: JobsClient,
  ) {
    super();
  }

  async process(job: Job<WorkflowEventJobData>): Promise<void> {
    const { event } = job.data;

    switch (event) {
      case 'stage-changed':
        await this.handleStageChanged(job.data);
        break;
      case 'story-published':
        await this.handleStoryPublished(job.data);
        break;
      case 'approval-requested':
        await this.handleApprovalRequested(job.data);
        break;
      case 'approval-resolved':
        await this.handleApprovalResolved(job.data);
        break;
    }
  }

  private async handleStageChanged(data: Extract<WorkflowEventJobData, { event: 'stage-changed' }>) {
    const { storyId, spaceId, toStageId, actorId } = data;

    const [stage] = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.id, toStageId))
      .limit(1);

    if (!stage) return;

    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    if (!story) return;

    const [actor] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1);

    const actorName = actor ? `${actor.firstname} ${actor.lastname}`.trim() || actor.email : 'System';

    // Notify users assigned to this stage
    const stageUserIds = stage.userIds as number[];
    for (const userId of stageUserIds) {
      if (userId === actorId) continue; // don't notify the actor

      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user) {
        await this.jobs.emails.send({
          type: 'workflow-stage-changed',
          to: user.email,
          storyName: story.name,
          stageName: stage.name,
          actorName,
          storyUrl: `${process.env.ADMIN_URL ?? ''}/spaces/${spaceId}/stories/${storyId}`,
        });
      }
    }

    this.logger.log(`Workflow event stage-changed: story=${storyId} → stage=${stage.name}`);
  }

  private async handleStoryPublished(data: Extract<WorkflowEventJobData, { event: 'story-published' }>) {
    // Future: trigger post-publish webhooks, CDN purge, etc.
    this.logger.log(`Workflow event story-published: story=${data.storyId}`);
  }

  private async handleApprovalRequested(data: Extract<WorkflowEventJobData, { event: 'approval-requested' }>) {
    const { storyId, spaceId, approverId, requesterId } = data;

    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    const [approver] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, approverId))
      .limit(1);

    const [requester] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    if (approver && story && requester) {
      const requesterName = `${requester.firstname} ${requester.lastname}`.trim() || requester.email;

      await this.jobs.emails.send({
        type: 'approval-request',
        to: approver.email,
        storyName: story.name,
        requesterName,
        storyUrl: `${process.env.ADMIN_URL ?? ''}/spaces/${spaceId}/stories/${storyId}`,
      });
    }

    this.logger.log(`Workflow event approval-requested: story=${storyId} approver=${approverId}`);
  }

  private async handleApprovalResolved(data: Extract<WorkflowEventJobData, { event: 'approval-resolved' }>) {
    const { storyId, spaceId, approverId, requesterId, status } = data;

    const [story] = await this.db
      .select()
      .from(stories)
      .where(and(eq(stories.id, BigInt(storyId)), eq(stories.spaceId, spaceId)))
      .limit(1);

    const [approver] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, approverId))
      .limit(1);

    const [requester] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, requesterId))
      .limit(1);

    if (requester && story && approver) {
      const resolverName = `${approver.firstname} ${approver.lastname}`.trim() || approver.email;

      await this.jobs.emails.send({
        type: 'approval-resolved',
        to: requester.email,
        storyName: story.name,
        status,
        resolverName,
        storyUrl: `${process.env.ADMIN_URL ?? ''}/spaces/${spaceId}/stories/${storyId}`,
      });
    }

    this.logger.log(`Workflow event approval-resolved: story=${storyId} status=${status}`);
  }
}
