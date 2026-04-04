import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { DbType } from '../db/db.module';
import { spaces } from '../db/schema';
import type { AiStoredSettings, AiConfigurationRecord, AiBrandingRule } from '../ai/ai.types';

/** Available providers and their supported models for /v1/ai_configurations/providers */
export const AI_PROVIDERS = {
  custom: {
    openai: {
      models: [
        { label: 'GPT-4o', value: 'gpt-4o', caption: 'Fastest GPT-4 model with multimodal support and high-quality reasoning (128k context)' },
        { label: 'GPT-4', value: 'gpt-4', caption: 'High-quality reasoning, long context (128k)' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', caption: 'Cheaper and faster GPT-4 variant (128k context)' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', caption: 'Fast and cost-effective (16k context)' },
      ],
    },
    anthropic: {
      models: [
        { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', caption: 'Most intelligent Claude 3.5 model' },
        { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022', caption: 'Fastest Claude 3.5 model' },
        { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229', caption: 'Most powerful Claude 3 model' },
      ],
    },
    anthropic_bedrock: {
      models: [
        { label: 'Claude 3.5 Sonnet (Bedrock)', value: 'anthropic.claude-3-5-sonnet-20241022-v2:0', caption: 'Claude 3.5 Sonnet via AWS Bedrock' },
        { label: 'Claude 3 Opus (Bedrock)', value: 'anthropic.claude-3-opus-20240229-v1:0', caption: 'Claude 3 Opus via AWS Bedrock' },
        { label: 'Claude 3 Sonnet (Bedrock)', value: 'anthropic.claude-3-sonnet-20240229-v1:0', caption: 'Claude 3 Sonnet via AWS Bedrock' },
      ],
    },
    gemini: {
      models: [
        { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', caption: 'Fast and versatile Gemini model' },
        { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', caption: 'Most capable Gemini 1.5 model' },
        { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash', caption: 'Next-gen Gemini Flash model' },
      ],
    },
  },
};

@Injectable()
export class AiConfigurationsService {
  constructor(@Inject(DB) private db: DbType) {}

  private async loadSettings(spaceId: number): Promise<AiStoredSettings> {
    const [row] = await this.db
      .select({ aiSettings: spaces.aiSettings })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);
    if (!row) throw new NotFoundException('Space not found');
    return (row.aiSettings as AiStoredSettings) ?? {};
  }

  private async saveSettings(spaceId: number, settings: AiStoredSettings): Promise<void> {
    await this.db
      .update(spaces)
      .set({ aiSettings: settings as any, updatedAt: new Date() })
      .where(eq(spaces.id, spaceId));
  }

  async listConfigurations(spaceId: number) {
    const settings = await this.loadSettings(spaceId);
    const configs = settings.configurations ?? [];

    return {
      ai_configurations: configs.map((c) => this.formatConfig(c)),
      meta: {
        default_ai_configuration_id: settings.default_configuration_id ?? null,
        org_default_ai_configuration_id: settings.default_configuration_id ?? null,
      },
    };
  }

  async getConfiguration(id: number, spaceId: number) {
    const settings = await this.loadSettings(spaceId);
    const config = (settings.configurations ?? []).find((c) => c.id === id);
    if (!config) throw new NotFoundException('AI configuration not found');
    return { ai_configuration: this.formatConfig(config) };
  }

  async createConfiguration(
    spaceId: number,
    data: {
      name: string;
      description?: string | null;
      provider_name: string;
      model_identifier: string;
      api_key?: string | null;
      settings?: Record<string, unknown>;
    },
  ) {
    const storedSettings = await this.loadSettings(spaceId);
    const configs = storedSettings.configurations ?? [];

    const newId = Date.now();
    const newConfig: AiConfigurationRecord = {
      id: newId,
      name: data.name,
      description: data.description ?? null,
      provider_name: data.provider_name as any,
      model_identifier: data.model_identifier,
      api_key: data.api_key ?? null,
      settings: data.settings ?? {},
      source: 'custom',
      custom: true,
    };

    const updatedConfigs = [...configs, newConfig];
    await this.saveSettings(spaceId, {
      ...storedSettings,
      configurations: updatedConfigs,
      // Auto-set as default if first config
      default_configuration_id: storedSettings.default_configuration_id ?? newId,
    });

    return { ai_configuration: this.formatConfig(newConfig) };
  }

  async updateConfiguration(
    id: number,
    spaceId: number,
    data: {
      name?: string;
      description?: string | null;
      provider_name?: string;
      model_identifier?: string;
      api_key?: string | null;
      settings?: Record<string, unknown>;
    },
  ) {
    const storedSettings = await this.loadSettings(spaceId);
    const configs = storedSettings.configurations ?? [];
    const idx = configs.findIndex((c) => c.id === id);
    if (idx === -1) throw new NotFoundException('AI configuration not found');

    const updated: AiConfigurationRecord = {
      ...configs[idx],
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.provider_name !== undefined && { provider_name: data.provider_name as any }),
      ...(data.model_identifier !== undefined && { model_identifier: data.model_identifier }),
      // Only update api_key if explicitly provided (non-undefined)
      ...(data.api_key !== undefined && { api_key: data.api_key }),
      ...(data.settings !== undefined && { settings: data.settings }),
    };

    configs[idx] = updated;
    await this.saveSettings(spaceId, { ...storedSettings, configurations: configs });

    return { ai_configuration: this.formatConfig(updated) };
  }

  async deleteConfiguration(id: number, spaceId: number): Promise<void> {
    const storedSettings = await this.loadSettings(spaceId);
    const configs = (storedSettings.configurations ?? []).filter((c) => c.id !== id);

    await this.saveSettings(spaceId, {
      ...storedSettings,
      configurations: configs,
      default_configuration_id:
        storedSettings.default_configuration_id === id
          ? (configs[0]?.id ?? null)
          : storedSettings.default_configuration_id,
    });
  }

  async setDefault(id: number, spaceId: number) {
    const storedSettings = await this.loadSettings(spaceId);
    const config = (storedSettings.configurations ?? []).find((c) => c.id === id);
    if (!config) throw new NotFoundException('AI configuration not found');

    await this.saveSettings(spaceId, { ...storedSettings, default_configuration_id: id });
    return { ai_configuration: this.formatConfig(config) };
  }

  getProviders() {
    return AI_PROVIDERS;
  }

  // ─── Branding Rules ─────────────────────────────────────────────────────────

  async getBrandingRule(spaceId: number) {
    const settings = await this.loadSettings(spaceId);
    return { ai_branding_rule: settings.branding_rule ?? null };
  }

  async updateBrandingRule(spaceId: number, rule: AiBrandingRule) {
    const storedSettings = await this.loadSettings(spaceId);
    await this.saveSettings(spaceId, { ...storedSettings, branding_rule: rule });
    return { ai_branding_rule: rule };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Returns configuration without credentials (api_key, aws secrets) */
  private formatConfig(c: AiConfigurationRecord) {
    const { api_key, ...rest } = c;
    // Strip aws credentials from settings
    const { aws_access_key_id, aws_secret_access_key, ...safeSettings } = rest.settings ?? {};
    return {
      ...rest,
      settings: safeSettings,
    };
  }

  /** Load the active configuration for AI usage (includes credentials) */
  async getActiveConfigWithCredentials(spaceId: number): Promise<AiConfigurationRecord | null> {
    const settings = await this.loadSettings(spaceId);
    const configs = settings.configurations ?? [];
    if (!configs.length) return null;

    const defaultId = settings.default_configuration_id;
    return configs.find((c) => c.id === defaultId) ?? configs[0] ?? null;
  }

  async getActiveBrandingRule(spaceId: number): Promise<AiBrandingRule | null> {
    const settings = await this.loadSettings(spaceId);
    return settings.branding_rule ?? null;
  }
}
