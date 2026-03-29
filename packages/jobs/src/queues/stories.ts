export const STORIES_QUEUE = 'stories';

export interface StoryPublishJobData {
  storyId: string;
  spaceId: number;
}

export interface StoryExpireJobData {
  storyId: string;
  spaceId: number;
}
