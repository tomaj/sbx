export const WORKFLOW_EVENTS_QUEUE = 'workflow-events';

export type WorkflowEventJobData =
  | {
      event: 'stage-changed';
      storyId: string;
      spaceId: number;
      fromStageId: number | null;
      toStageId: number;
      actorId: number;
    }
  | {
      event: 'story-published';
      storyId: string;
      spaceId: number;
      actorId: number | null;
    }
  | {
      event: 'approval-requested';
      storyId: string;
      spaceId: number;
      approverId: number;
      requesterId: number;
    }
  | {
      event: 'approval-resolved';
      storyId: string;
      spaceId: number;
      approverId: number;
      requesterId: number;
      status: 'approved' | 'rejected';
    };
