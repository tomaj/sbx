import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import {
  WEBHOOKS_QUEUE,
  STORIES_QUEUE,
  RELEASES_QUEUE,
  EMAILS_QUEUE,
  WORKFLOW_EVENTS_QUEUE,
} from '@sbx/jobs';

import { LoggingModule } from './logging/logging.module.js';
import { DbModule } from './db/db.module.js';
import { EmailModule } from './email/email.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { JobsClientModule } from './jobs-client.module.js';

import { WebhooksProcessor } from './processors/webhooks.processor.js';
import { StorySchedulerProcessor } from './processors/story-scheduler.processor.js';
import { ReleasesProcessor } from './processors/releases.processor.js';
import { EmailsProcessor } from './processors/emails.processor.js';
import { WorkflowEventsProcessor } from './processors/workflow-events.processor.js';

const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

const queues = [WEBHOOKS_QUEUE, STORIES_QUEUE, RELEASES_QUEUE, EMAILS_QUEUE, WORKFLOW_EVENTS_QUEUE];

@Module({
  imports: [
    LoggingModule,
    JobsClientModule,
    DbModule,
    EmailModule,
    ScheduleModule.forRoot(),

    BullModule.forRoot({ connection: redisConnection }),
    ...queues.map((name) => BullModule.registerQueue({ name })),

    BullBoardModule.forRoot({
      route: '/ui',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(...queues.map((name) => ({ name, adapter: BullMQAdapter }))),

    SchedulerModule,
  ],
  providers: [
    WebhooksProcessor,
    StorySchedulerProcessor,
    ReleasesProcessor,
    EmailsProcessor,
    WorkflowEventsProcessor,
  ],
})
export class AppModule {}
