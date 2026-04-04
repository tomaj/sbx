export type AiProvider = 'openai' | 'anthropic' | 'anthropic_bedrock' | 'gemini';

export interface AiConfigurationRecord {
  id: number;
  name: string;
  description?: string | null;
  provider_name: AiProvider;
  model_identifier: string;
  // Credentials — never exposed in API responses
  api_key?: string | null;
  // AWS Bedrock credentials (stored in settings)
  settings?: {
    aws_region?: string;
    aws_access_key_id?: string;
    aws_secret_access_key?: string;
    [key: string]: unknown;
  };
  source: 'custom';
  custom: true;
}

export interface AiBrandingRule {
  industry_niche?: string | null;
  brand_product_service?: string | null;
  target_audience?: string | null;
  tone_guidelines?: string | null;
  writing_style?: string | null;
  values_or_personality_traits?: string | null;
  formatting?: string | null;
  always_use?: string | null;
  commonly_use?: string | null;
  avoid_use?: string | null;
  never_use?: string | null;
  additional_guidelines?: string | null;
}

/** Internal structure stored in spaces.ai_settings JSON column */
export interface AiStoredSettings {
  configurations?: AiConfigurationRecord[];
  default_configuration_id?: number | null;
  branding_rule?: AiBrandingRule | null;
}
