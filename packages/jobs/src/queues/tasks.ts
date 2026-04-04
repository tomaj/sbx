export const TASKS_QUEUE = 'tasks';

export interface TaskExecuteJobData {
  taskId: number;
  spaceId: number;
  webhookUrl: string;
  taskName: string;
  userEmail: string;
  dialogValues: Record<string, unknown>;
}
