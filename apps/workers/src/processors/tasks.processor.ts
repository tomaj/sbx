import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { TASKS_QUEUE } from '@sbx/jobs';
import type { TaskExecuteJobData } from '@sbx/jobs';
import { DB } from '../db/db.module.js';
import type { DbType } from '../db/db.module.js';
import { tasks } from '../db/schema.js';

@Processor(TASKS_QUEUE, { concurrency: 5 })
export class TasksProcessor extends WorkerHost {
  private readonly logger = new Logger(TasksProcessor.name);

  constructor(@Inject(DB) private db: DbType) {
    super();
  }

  async process(job: Job<TaskExecuteJobData>): Promise<void> {
    const { taskId, spaceId, webhookUrl, taskName, userEmail, dialogValues } = job.data;

    this.logger.debug(`Executing task ${taskId} (${taskName}) for space ${spaceId}`);

    const payload = {
      task: { id: taskId, name: taskName },
      text: `The user ${userEmail} executed the task "${taskName}"`,
      action: 'task_execution',
      space_id: spaceId,
      dialog_values: dialogValues ?? {},
    };

    let lastResponse: Record<string, unknown>;

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });

      lastResponse = { status: res.status, ok: res.ok };

      if (!res.ok) {
        throw new Error(`Task webhook returned HTTP ${res.status}`);
      }

      this.logger.log(`Task ${taskId} executed successfully (HTTP ${res.status})`);
    } catch (err) {
      lastResponse = { error: (err as Error).message };
      this.logger.warn(`Task ${taskId} execution failed: ${(err as Error).message}`);
      // Update DB before re-throwing so BullMQ can retry
      await this.db
        .update(tasks)
        .set({ running: false, lastExecution: new Date(), lastResponse, updatedAt: new Date() })
        .where(eq(tasks.id, taskId));
      throw err;
    }

    await this.db
      .update(tasks)
      .set({ running: false, lastExecution: new Date(), lastResponse, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }
}
