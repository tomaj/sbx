export const EMAILS_QUEUE = 'emails';

export type EmailJobData =
  | {
      type: 'invitation';
      to: string;
      spaceName: string;
      inviterName: string;
      inviteUrl: string;
    }
  | {
      type: 'comment-notification';
      to: string;
      storyName: string;
      commentAuthor: string;
      commentText: string;
      storyUrl: string;
    }
  | {
      type: 'approval-request';
      to: string;
      storyName: string;
      requesterName: string;
      storyUrl: string;
    }
  | {
      type: 'approval-resolved';
      to: string;
      storyName: string;
      status: 'approved' | 'rejected';
      resolverName: string;
      storyUrl: string;
    }
  | {
      type: 'workflow-stage-changed';
      to: string;
      storyName: string;
      stageName: string;
      actorName: string;
      storyUrl: string;
    }
  | {
      type: 'release-notification';
      to: string;
      releaseName: string;
      releaseAt: string;
      spaceId: number;
    };
