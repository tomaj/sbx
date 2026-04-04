'use client';

import { useState, useEffect, use } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal';
import { SkeletonText, SkeletonBlock } from '@/components/ui/skeleton';
import { SettingsSection } from '@/components/ui/settings-section';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiConfiguration {
  id: number;
  name: string;
  description: string | null;
  provider_name: string;
  model_identifier: string;
  settings: Record<string, unknown>;
  source: string;
  custom: boolean;
}

interface AiBrandingRule {
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

interface ProviderModel {
  label: string;
  value: string;
  caption: string;
}
interface ProvidersResponse {
  custom: Record<string, { models: ProviderModel[] }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Direct)',
  anthropic_bedrock: 'Anthropic via AWS Bedrock',
  gemini: 'Google Gemini',
};

const EMPTY_BRANDING: AiBrandingRule = {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiSettingsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const [tab, setTab] = useState<'general' | 'branding'>('general');

  const {
    data: cfgData,
    isLoading: cfgLoading,
    mutate: mutateConfigurations,
  } = useApi<any>(`/api/admin/spaces/${spaceId}/ai-configurations`);

  const { data: providersData, isLoading: providersLoading } = useApi<ProvidersResponse>(
    `/api/admin/spaces/${spaceId}/ai-configurations/providers`,
  );

  const {
    data: brandingData,
    isLoading: brandingLoading,
    mutate: mutateBranding,
  } = useApi<any>(`/api/admin/spaces/${spaceId}/ai-branding-rules`);

  const loading = cfgLoading || providersLoading || brandingLoading;

  const configurations: AiConfiguration[] = cfgData?.ai_configurations ?? [];
  const defaultConfigId: number | null = cfgData?.meta?.default_ai_configuration_id ?? null;
  const providers: ProvidersResponse['custom'] = providersData?.custom ?? {};

  // Branding state — derived from API data, kept in local state for editing
  const [branding, setBranding] = useState<AiBrandingRule>(EMPTY_BRANDING);
  const [brandingInitialized, setBrandingInitialized] = useState(false);

  useEffect(() => {
    if (brandingData?.ai_branding_rule && !brandingInitialized) {
      const r = brandingData.ai_branding_rule;
      setBranding({
        industry_niche: r.industry_niche ?? '',
        brand_product_service: r.brand_product_service ?? '',
        target_audience: r.target_audience ?? '',
        tone_guidelines: r.tone_guidelines ?? '',
        writing_style: r.writing_style ?? '',
        values_or_personality_traits: r.values_or_personality_traits ?? '',
        formatting: r.formatting ?? '',
        always_use: r.always_use ?? '',
        commonly_use: r.commonly_use ?? '',
        avoid_use: r.avoid_use ?? '',
        never_use: r.never_use ?? '',
        additional_guidelines: r.additional_guidelines ?? '',
      });
      setBrandingInitialized(true);
    }
  }, [brandingData, brandingInitialized]);

  // New / edit form
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('openai');
  const [formModel, setFormModel] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formAwsRegion, setFormAwsRegion] = useState('us-east-1');
  const [formAwsKeyId, setFormAwsKeyId] = useState('');
  const [formAwsSecret, setFormAwsSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [deleteConfigId, setDeleteConfigId] = useState<number | null>(null);

  // Branding state
  const [savingBranding, setSavingBranding] = useState(false);
  const [savedBranding, setSavedBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);
  const [brandingIsDirty, setBrandingIsDirty] = useState(false);
  const [configFormIsDirty, setConfigFormIsDirty] = useState(false);
  const {
    showModal: showUnsavedModal,
    handleConfirm: confirmUnsaved,
    handleCancel: cancelUnsaved,
  } = useUnsavedChanges(brandingIsDirty || configFormIsDirty);

  // Provider options
  const providerOptions = Object.keys({
    openai: true,
    anthropic: true,
    anthropic_bedrock: true,
    gemini: true,
  }).map((p) => ({
    value: p,
    label: PROVIDER_LABELS[p] ?? p,
  }));

  // Model options for selected provider
  const modelOptions = (providers[formProvider]?.models ?? []).map((m) => ({
    value: m.value,
    label: m.label,
  }));

  function openNewForm() {
    setEditingId('new');
    setFormName('');
    setFormProvider('openai');
    setFormModel('');
    setFormApiKey('');
    setFormAwsRegion('us-east-1');
    setFormAwsKeyId('');
    setFormAwsSecret('');
    setConfigError(null);
    setConfigFormIsDirty(false);
  }

  function openEditForm(cfg: AiConfiguration) {
    setEditingId(cfg.id);
    setFormName(cfg.name);
    setFormProvider(cfg.provider_name);
    setFormModel(cfg.model_identifier);
    setFormApiKey(''); // never pre-fill secrets
    setFormAwsRegion((cfg.settings?.aws_region as string) ?? 'us-east-1');
    setFormAwsKeyId((cfg.settings?.aws_access_key_id as string) ?? '');
    setFormAwsSecret('');
    setConfigError(null);
    setConfigFormIsDirty(false);
  }

  async function handleSaveConfig() {
    if (!formName.trim() || !formModel.trim()) {
      setConfigError('Name and model are required');
      return;
    }
    setSavingConfig(true);
    setConfigError(null);
    try {
      const settings: Record<string, unknown> = {};
      if (formProvider === 'anthropic_bedrock') {
        settings.aws_region = formAwsRegion;
        if (formAwsKeyId) settings.aws_access_key_id = formAwsKeyId;
        if (formAwsSecret) settings.aws_secret_access_key = formAwsSecret;
      }

      const payload: Record<string, unknown> = {
        name: formName,
        provider_name: formProvider,
        model_identifier: formModel,
        settings,
      };
      if (formProvider !== 'anthropic_bedrock' && formApiKey) payload.api_key = formApiKey;

      let res: Response;
      if (editingId === 'new') {
        res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_configuration: payload }),
        });
      } else {
        res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_configuration: payload }),
        });
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? 'Failed to save');
      }

      await mutateConfigurations();
      setConfigFormIsDirty(false);
      setEditingId(null);
    } catch (e: any) {
      setConfigError(e.message);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleDeleteConfig(id: number) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations/${id}`, {
      method: 'DELETE',
    });
    if (res.ok || res.status === 204) {
      await mutateConfigurations();
    }
    setDeleteConfigId(null);
  }

  async function handleSaveBranding() {
    setSavingBranding(true);
    setBrandingError(null);
    setSavedBranding(false);
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/ai-branding-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_branding_rule: Object.fromEntries(
            Object.entries(branding).map(([k, v]) => [k, v || null]),
          ),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? 'Failed to save');
      }
      await mutateBranding();
      setBrandingIsDirty(false);
      setSavedBranding(true);
      setTimeout(() => setSavedBranding(false), 2000);
    } catch (e: any) {
      setBrandingError(e.message);
    } finally {
      setSavingBranding(false);
    }
  }

  function updateBranding(updater: (b: AiBrandingRule) => AiBrandingRule) {
    setBranding(updater);
    setBrandingIsDirty(true);
  }

  if (loading) {
    return (
      <div className="max-w-2xl px-10 py-8 space-y-4">
        <SkeletonText className="h-8 w-48" />
        <SkeletonText className="h-4 w-80" />
        <SkeletonBlock className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-10 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">AI Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Configure AI provider and branding context for AI-powered features in this space.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        {(['general', 'branding'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── General tab ────────────────────────────────────────────────────── */}
      {tab === 'general' && (
        <div>
          <SettingsSection
            title="AI Configurations"
            description="Add a custom AI provider configuration. The default configuration is used for all AI features in this space."
          >
            {/* Existing configs */}
            {configurations.length > 0 && (
              <div className="space-y-3 mb-5">
                {configurations.map((cfg) => (
                  <div
                    key={cfg.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {cfg.name}
                        </p>
                        {cfg.id === defaultConfigId && (
                          <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {PROVIDER_LABELS[cfg.provider_name] ?? cfg.provider_name} ·{' '}
                        {cfg.model_identifier}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(cfg)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfigId(cfg.id)}
                        className="p-1 text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add config button */}
            {editingId === null && (
              <button
                onClick={openNewForm}
                className="flex items-center gap-2 px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20"
              >
                <Plus className="w-4 h-4" />
                Add AI Configuration
              </button>
            )}

            {/* Edit / New form */}
            {editingId !== null && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {editingId === 'new' ? 'New Configuration' : 'Edit Configuration'}
                </h3>

                {configError && (
                  <p className="mb-3 text-xs text-red-600 dark:text-red-400">{configError}</p>
                )}

                <FormField label="Name">
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      setConfigFormIsDirty(true);
                    }}
                    placeholder="e.g. Custom OpenAI"
                    className={inputCls}
                  />
                </FormField>

                <FormField label="Provider">
                  <SelectDropdown
                    value={formProvider}
                    onChange={(v) => {
                      setFormProvider(v ?? 'openai');
                      setFormModel('');
                      setConfigFormIsDirty(true);
                    }}
                    options={providerOptions}
                  />
                </FormField>

                <FormField label="Model">
                  {modelOptions.length > 0 ? (
                    <SelectDropdown
                      value={formModel}
                      onChange={(v) => {
                        setFormModel(v ?? '');
                        setConfigFormIsDirty(true);
                      }}
                      options={modelOptions}
                      placeholder="Select model..."
                    />
                  ) : (
                    <input
                      type="text"
                      value={formModel}
                      onChange={(e) => {
                        setFormModel(e.target.value);
                        setConfigFormIsDirty(true);
                      }}
                      placeholder="Model identifier"
                      className={inputCls}
                    />
                  )}
                </FormField>

                {formProvider !== 'anthropic_bedrock' && (
                  <FormField
                    label={`API Key${editingId !== 'new' ? ' (leave blank to keep existing)' : ''}`}
                  >
                    <input
                      type="password"
                      value={formApiKey}
                      onChange={(e) => {
                        setFormApiKey(e.target.value);
                        setConfigFormIsDirty(true);
                      }}
                      placeholder="sk-..."
                      className={inputCls}
                    />
                  </FormField>
                )}

                {formProvider === 'anthropic_bedrock' && (
                  <>
                    <FormField label="AWS Region">
                      <input
                        type="text"
                        value={formAwsRegion}
                        onChange={(e) => {
                          setFormAwsRegion(e.target.value);
                          setConfigFormIsDirty(true);
                        }}
                        placeholder="us-east-1"
                        className={inputCls}
                      />
                    </FormField>
                    <FormField label="AWS Access Key ID">
                      <input
                        type="text"
                        value={formAwsKeyId}
                        onChange={(e) => {
                          setFormAwsKeyId(e.target.value);
                          setConfigFormIsDirty(true);
                        }}
                        className={inputCls}
                      />
                    </FormField>
                    <FormField
                      label={`AWS Secret Access Key${editingId !== 'new' ? ' (leave blank to keep existing)' : ''}`}
                    >
                      <input
                        type="password"
                        value={formAwsSecret}
                        onChange={(e) => {
                          setFormAwsSecret(e.target.value);
                          setConfigFormIsDirty(true);
                        }}
                        className={inputCls}
                      />
                    </FormField>
                  </>
                )}

                <div className="flex gap-2 justify-end mt-4">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {savingConfig ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </SettingsSection>

          {deleteConfigId !== null && (
            <ConfirmModal
              open
              title="Delete Configuration"
              message="Are you sure you want to delete this AI configuration?"
              confirmLabel="Delete"
              dangerous
              onConfirm={() => handleDeleteConfig(deleteConfigId)}
              onCancel={() => setDeleteConfigId(null)}
            />
          )}
        </div>
      )}

      {/* ─── Branding tab ───────────────────────────────────────────────────── */}
      {tab === 'branding' && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={handleSaveBranding}
              disabled={savingBranding}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg"
            >
              <Check className="w-4 h-4" />
              {savingBranding ? 'Saving...' : savedBranding ? 'Saved' : 'Save'}
            </button>
          </div>
          {brandingError && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{brandingError}</p>
          )}

          <SettingsSection
            title="Business Context"
            description="Provides key background about your business to help the AI generate content that fits your brand's identity and goals."
          >
            <FormField
              label="Industry & Niche"
              maxLength={200}
              currentLength={branding.industry_niche.length}
              description="Specifies the sector (e.g., hospitality, fintech, retail) to adapt tone and language."
            >
              <input
                type="text"
                value={branding.industry_niche}
                onChange={(e) => updateBranding((b) => ({ ...b, industry_niche: e.target.value }))}
                maxLength={200}
                placeholder="Example: B2B SaaS for e-commerce brands."
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Brand, Product, or Service"
              maxLength={1000}
              currentLength={branding.brand_product_service.length}
              description="Brief description of what the business offers."
            >
              <textarea
                value={branding.brand_product_service}
                onChange={(e) =>
                  updateBranding((b) => ({ ...b, brand_product_service: e.target.value }))
                }
                maxLength={1000}
                placeholder="Example: Analytics dashboard for small businesses."
                rows={3}
                className={`${inputCls} resize-y`}
              />
            </FormField>
            <FormField
              label="Target Audience"
              maxLength={200}
              currentLength={branding.target_audience.length}
              description="Defines who the message is for."
            >
              <input
                type="text"
                value={branding.target_audience}
                onChange={(e) => updateBranding((b) => ({ ...b, target_audience: e.target.value }))}
                maxLength={200}
                placeholder="Example: Independent restaurant owners, not tech-savvy."
                className={inputCls}
              />
            </FormField>
          </SettingsSection>

          <SettingsSection
            title="Brand Voice & Tone"
            description="Defines how your brand sounds—its personality, tone, and style."
          >
            <FormField
              label="Tone Guidelines"
              maxLength={200}
              currentLength={branding.tone_guidelines.length}
              description="Define the tone of the content."
            >
              <input
                type="text"
                value={branding.tone_guidelines}
                onChange={(e) => updateBranding((b) => ({ ...b, tone_guidelines: e.target.value }))}
                maxLength={200}
                placeholder="Example: Supportive and easygoing, but professional."
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Writing Style"
              maxLength={200}
              currentLength={branding.writing_style.length}
              description="Define the writing style of the content."
            >
              <input
                type="text"
                value={branding.writing_style}
                onChange={(e) => updateBranding((b) => ({ ...b, writing_style: e.target.value }))}
                maxLength={200}
                placeholder="Example: Conversational with light humor, similar to Slack's style."
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Values or Personality Traits"
              maxLength={200}
              currentLength={branding.values_or_personality_traits.length}
              description="Define the values of your brand and personality traits."
            >
              <input
                type="text"
                value={branding.values_or_personality_traits}
                onChange={(e) =>
                  updateBranding((b) => ({ ...b, values_or_personality_traits: e.target.value }))
                }
                maxLength={200}
                placeholder="Example: Innovative, trustworthy, customer-first."
                className={inputCls}
              />
            </FormField>
          </SettingsSection>

          <SettingsSection
            title="Preferences"
            description="Defines what the AI should or shouldn't include—like specific words, tone, or formatting."
          >
            <FormField
              label="Formatting"
              maxLength={200}
              currentLength={branding.formatting.length}
              description="Define the output style rules for the generated content."
            >
              <input
                type="text"
                value={branding.formatting}
                onChange={(e) => updateBranding((b) => ({ ...b, formatting: e.target.value }))}
                maxLength={200}
                placeholder='"Use short paragraphs", "Avoid all caps".'
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Always Use"
              maxLength={200}
              currentLength={branding.always_use.length}
              description="Terms, styles, or structures to always include."
            >
              <input
                type="text"
                value={branding.always_use}
                onChange={(e) => updateBranding((b) => ({ ...b, always_use: e.target.value }))}
                maxLength={200}
                placeholder='"Our", "We", brand-specific terminology.'
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Commonly Use"
              maxLength={200}
              currentLength={branding.commonly_use.length}
              description="Terms, styles, or structures to use frequently when appropriate."
            >
              <input
                type="text"
                value={branding.commonly_use}
                onChange={(e) => updateBranding((b) => ({ ...b, commonly_use: e.target.value }))}
                maxLength={200}
                placeholder='"Easy to use," "No credit card required."'
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Avoid Use"
              maxLength={200}
              currentLength={branding.avoid_use.length}
              description="Terms, styles, or structures to minimize or exclude."
            >
              <input
                type="text"
                value={branding.avoid_use}
                onChange={(e) => updateBranding((b) => ({ ...b, avoid_use: e.target.value }))}
                maxLength={200}
                placeholder='"Technical jargon", "Complicated setups"'
                className={inputCls}
              />
            </FormField>
            <FormField
              label="Never Use"
              maxLength={200}
              currentLength={branding.never_use.length}
              description="Terms, styles, or structures that should be completely avoided."
            >
              <input
                type="text"
                value={branding.never_use}
                onChange={(e) => updateBranding((b) => ({ ...b, never_use: e.target.value }))}
                maxLength={200}
                placeholder='"Cheap," "ASAP," or overly pushy language.'
                className={inputCls}
              />
            </FormField>
          </SettingsSection>

          <SettingsSection
            title="Additional Information"
            description="Use this field to add any extra context, edge cases, or temporary notes that help the AI get things just right."
          >
            <FormField
              label="Markdown"
              maxLength={1000}
              currentLength={branding.additional_guidelines.length}
            >
              <textarea
                value={branding.additional_guidelines}
                onChange={(e) =>
                  updateBranding((b) => ({ ...b, additional_guidelines: e.target.value }))
                }
                maxLength={1000}
                placeholder="Add any extra context in markdown format..."
                rows={6}
                className={`${inputCls} resize-y`}
              />
            </FormField>
          </SettingsSection>
        </div>
      )}

      <UnsavedChangesModal
        open={showUnsavedModal}
        onConfirm={confirmUnsaved}
        onCancel={cancelUnsaved}
      />
    </div>
  );
}
