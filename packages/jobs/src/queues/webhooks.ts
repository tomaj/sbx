export const WEBHOOKS_QUEUE = 'webhooks';

export interface WebhookDispatchJobData {
  spaceId: number;
  webhookEndpointId: number;
  endpoint: string;
  secret: string | null;
  action: string;
  payload: Record<string, unknown>;
}
