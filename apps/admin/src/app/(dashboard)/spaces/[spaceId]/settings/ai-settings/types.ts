export interface AiConfiguration {
  id: number;
  name: string;
  description: string | null;
  provider_name: string;
  model_identifier: string;
  settings: Record<string, unknown>;
  source: string;
  custom: boolean;
}

export interface AiBrandingRule {
  industry_niche: string;
  brand_product_service: string;
  target_audience: string;
  tone_guidelines: string;
  writing_style: string;
  values_or_personality_traits: string;
  formatting: string;
  always_use: string;
  commonly_use: string;
  avoid_use: string;
  never_use: string;
  additional_guidelines: string;
}

export interface ProviderModel {
  label: string;
  value: string;
  caption: string;
}

export interface ProvidersResponse {
  custom: Record<string, { models: ProviderModel[] }>;
}

export const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Direct)',
  anthropic_bedrock: 'Anthropic via AWS Bedrock',
  gemini: 'Google Gemini',
};

export const EMPTY_BRANDING: AiBrandingRule = {
  industry_niche: '',
  brand_product_service: '',
  target_audience: '',
  tone_guidelines: '',
  writing_style: '',
  values_or_personality_traits: '',
  formatting: '',
  always_use: '',
  commonly_use: '',
  avoid_use: '',
  never_use: '',
  additional_guidelines: '',
};
