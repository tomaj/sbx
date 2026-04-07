'use client';

import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { SelectDropdown } from '@/components/ui/select-dropdown';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { SettingsSection } from '@/components/ui/settings-section';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';
import type { AiConfiguration, ProvidersResponse } from './types';
import { PROVIDER_LABELS } from './types';

export function AiConfigSection({
  spaceId,
  onDirtyChange,
}: {
  spaceId: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic config
  const { data: cfgData, mutate: mutateConfigurations } = useApi<any>(
    `/api/admin/spaces/${spaceId}/ai-configurations`,
  );

  const { data: providersData } = useApi<ProvidersResponse>(
    `/api/admin/spaces/${spaceId}/ai-configurations/providers`,
  );

  const configurations: AiConfiguration[] = cfgData?.ai_configurations ?? [];
  const defaultConfigId: number | null = cfgData?.meta?.default_ai_configuration_id ?? null;
  const providers: ProvidersResponse['custom'] = providersData?.custom ?? {};

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

  const providerOptions = Object.keys({
    openai: true,
    anthropic: true,
    anthropic_bedrock: true,
    gemini: true,
  }).map((p) => ({
    value: p,
    label: PROVIDER_LABELS[p] ?? p,
  }));

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
    onDirtyChange(false);
  }

  function openEditForm(cfg: AiConfiguration) {
    setEditingId(cfg.id);
    setFormName(cfg.name);
    setFormProvider(cfg.provider_name);
    setFormModel(cfg.model_identifier);
    setFormApiKey('');
    setFormAwsRegion((cfg.settings?.aws_region as string) ?? 'us-east-1');
    setFormAwsKeyId((cfg.settings?.aws_access_key_id as string) ?? '');
    setFormAwsSecret('');
    setConfigError(null);
    onDirtyChange(false);
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
      onDirtyChange(false);
      setEditingId(null);
      // biome-ignore lint/suspicious/noExplicitAny: dynamic config
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

  return (
    <div>
      <SettingsSection
        title="AI Configurations"
        description="Add a custom AI provider configuration. The default configuration is used for all AI features in this space."
      >
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
                    type="button"
                    onClick={() => openEditForm(cfg)}
                    className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
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

        {editingId === null && (
          <button
            type="button"
            onClick={openNewForm}
            className="flex items-center gap-2 px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20"
          >
            <Plus className="w-4 h-4" />
            Add AI Configuration
          </button>
        )}

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
                  onDirtyChange(true);
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
                  onDirtyChange(true);
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
                    onDirtyChange(true);
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
                    onDirtyChange(true);
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
                    onDirtyChange(true);
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
                      onDirtyChange(true);
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
                      onDirtyChange(true);
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
                      onDirtyChange(true);
                    }}
                    className={inputCls}
                  />
                </FormField>
              </>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
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
  );
}
