'use client'

import { useState, useEffect, use } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { UnsavedChangesModal } from '@/components/ui/unsaved-changes-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiConfiguration {
  id: number
  name: string
  description: string | null
  provider_name: string
  model_identifier: string
  settings: Record<string, unknown>
  source: string
  custom: boolean
}

interface AiConfigurationsResponse {
  ai_configurations: AiConfiguration[]
  meta: { default_ai_configuration_id: number | null; org_default_ai_configuration_id: number | null }
}

interface AiBrandingRule {
  industry_niche: string
  brand_product_service: string
  target_audience: string
  tone_guidelines: string
  writing_style: string
  values_or_personality_traits: string
  formatting: string
  always_use: string
  commonly_use: string
  avoid_use: string
  never_use: string
  additional_guidelines: string
}

interface ProviderModel { label: string; value: string; caption: string }
interface ProvidersResponse {
  custom: Record<string, { models: ProviderModel[] }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Direct)',
  anthropic_bedrock: 'Anthropic via AWS Bedrock',
  gemini: 'Google Gemini',
}

const EMPTY_BRANDING: AiBrandingRule = {
  industry_niche: '', brand_product_service: '', target_audience: '',
  tone_guidelines: '', writing_style: '', values_or_personality_traits: '',
  formatting: '', always_use: '', commonly_use: '',
  avoid_use: '', never_use: '', additional_guidelines: '',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsSection({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-8 mb-8 last:border-0">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  )
}

function InputField({ label, description, value, onChange, maxLength, placeholder, type = 'text' }: {
  label: string; description?: string; value: string; onChange: (v: string) => void
  maxLength?: number; placeholder?: string; type?: string
}) {
  const cls = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500'
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength} placeholder={placeholder} className={cls} />
      <div className="flex justify-between mt-1">
        {description && <p className="text-xs text-gray-400">{description}</p>}
        {maxLength !== undefined && <p className="text-xs text-gray-400 ml-auto">{value.length}/{maxLength}</p>}
      </div>
    </div>
  )
}

function TextareaField({ label, description, value, onChange, maxLength, placeholder, rows = 3 }: {
  label: string; description?: string; value: string; onChange: (v: string) => void
  maxLength?: number; placeholder?: string; rows?: number
}) {
  const cls = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y'
  return (
    <div className="mb-5">
      <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength} placeholder={placeholder} rows={rows} className={cls} />
      <div className="flex justify-between mt-1">
        {description && <p className="text-xs text-gray-400">{description}</p>}
        {maxLength !== undefined && <p className="text-xs text-gray-400 ml-auto">{value.length}/{maxLength}</p>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiSettingsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params)

  const [tab, setTab] = useState<'general' | 'branding'>('general')
  const [loading, setLoading] = useState(true)

  // Configurations state
  const [configurations, setConfigurations] = useState<AiConfiguration[]>([])
  const [defaultConfigId, setDefaultConfigId] = useState<number | null>(null)
  const [providers, setProviders] = useState<ProvidersResponse['custom']>({})

  // New / edit form
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState('openai')
  const [formModel, setFormModel] = useState('')
  const [formApiKey, setFormApiKey] = useState('')
  const [formAwsRegion, setFormAwsRegion] = useState('us-east-1')
  const [formAwsKeyId, setFormAwsKeyId] = useState('')
  const [formAwsSecret, setFormAwsSecret] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [deleteConfigId, setDeleteConfigId] = useState<number | null>(null)

  // Branding state
  const [branding, setBranding] = useState<AiBrandingRule>(EMPTY_BRANDING)
  const [savingBranding, setSavingBranding] = useState(false)
  const [savedBranding, setSavedBranding] = useState(false)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [brandingIsDirty, setBrandingIsDirty] = useState(false)
  const [configFormIsDirty, setConfigFormIsDirty] = useState(false)
  const { showModal: showUnsavedModal, handleConfirm: confirmUnsaved, handleCancel: cancelUnsaved } = useUnsavedChanges(brandingIsDirty || configFormIsDirty)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/spaces/${spaceId}/ai-configurations`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/admin/spaces/${spaceId}/ai-configurations/providers`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/admin/spaces/${spaceId}/ai-branding-rules`).then((r) => r.ok ? r.json() : null),
    ]).then(([cfgData, providersData, brandingData]: any[]) => {
      if (cfgData) {
        setConfigurations(cfgData.ai_configurations ?? [])
        setDefaultConfigId(cfgData.meta?.default_ai_configuration_id ?? null)
      }
      if (providersData?.custom) setProviders(providersData.custom)
      if (brandingData?.ai_branding_rule) {
        const r = brandingData.ai_branding_rule
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
        })
      }
    }).finally(() => setLoading(false))
  }, [spaceId])

  // Provider options
  const providerOptions = Object.keys({ openai: true, anthropic: true, anthropic_bedrock: true, gemini: true }).map((p) => ({
    value: p, label: PROVIDER_LABELS[p] ?? p,
  }))

  // Model options for selected provider
  const modelOptions = (providers[formProvider]?.models ?? []).map((m) => ({
    value: m.value, label: m.label,
  }))

  function openNewForm() {
    setEditingId('new')
    setFormName('')
    setFormProvider('openai')
    setFormModel('')
    setFormApiKey('')
    setFormAwsRegion('us-east-1')
    setFormAwsKeyId('')
    setFormAwsSecret('')
    setConfigError(null)
    setConfigFormIsDirty(false)
  }

  function openEditForm(cfg: AiConfiguration) {
    setEditingId(cfg.id)
    setFormName(cfg.name)
    setFormProvider(cfg.provider_name)
    setFormModel(cfg.model_identifier)
    setFormApiKey('') // never pre-fill secrets
    setFormAwsRegion((cfg.settings?.aws_region as string) ?? 'us-east-1')
    setFormAwsKeyId((cfg.settings?.aws_access_key_id as string) ?? '')
    setFormAwsSecret('')
    setConfigError(null)
    setConfigFormIsDirty(false)
  }

  async function handleSaveConfig() {
    if (!formName.trim() || !formModel.trim()) { setConfigError('Name and model are required'); return }
    setSavingConfig(true)
    setConfigError(null)
    try {
      const settings: Record<string, unknown> = {}
      if (formProvider === 'anthropic_bedrock') {
        settings.aws_region = formAwsRegion
        if (formAwsKeyId) settings.aws_access_key_id = formAwsKeyId
        if (formAwsSecret) settings.aws_secret_access_key = formAwsSecret
      }

      const payload: Record<string, unknown> = {
        name: formName, provider_name: formProvider, model_identifier: formModel, settings,
      }
      if (formProvider !== 'anthropic_bedrock' && formApiKey) payload.api_key = formApiKey

      let res: Response
      if (editingId === 'new') {
        res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_configuration: payload }),
        })
      } else {
        res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ai_configuration: payload }),
        })
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to save')
      }
      const data = await res.json()
      const saved: AiConfiguration = data.ai_configuration

      if (editingId === 'new') {
        setConfigurations((prev) => [...prev, saved])
        if (!defaultConfigId) setDefaultConfigId(saved.id)
      } else {
        setConfigurations((prev) => prev.map((c) => c.id === saved.id ? saved : c))
      }
      setConfigFormIsDirty(false)
      setEditingId(null)
    } catch (e: any) {
      setConfigError(e.message)
    } finally {
      setSavingConfig(false)
    }
  }

  async function handleDeleteConfig(id: number) {
    const res = await fetch(`/api/admin/spaces/${spaceId}/ai-configurations/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setConfigurations((prev) => prev.filter((c) => c.id !== id))
      if (defaultConfigId === id) setDefaultConfigId(null)
    }
    setDeleteConfigId(null)
  }

  async function handleSaveBranding() {
    setSavingBranding(true)
    setBrandingError(null)
    setSavedBranding(false)
    try {
      const res = await fetch(`/api/admin/spaces/${spaceId}/ai-branding-rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_branding_rule: Object.fromEntries(
            Object.entries(branding).map(([k, v]) => [k, v || null])
          ),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to save')
      }
      setBrandingIsDirty(false)
      setSavedBranding(true)
      setTimeout(() => setSavedBranding(false), 2000)
    } catch (e: any) {
      setBrandingError(e.message)
    } finally {
      setSavingBranding(false)
    }
  }

  function updateBranding(updater: (b: AiBrandingRule) => AiBrandingRule) {
    setBranding(updater)
    setBrandingIsDirty(true)
  }

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500'

  if (loading) {
    return (
      <div className="max-w-2xl px-10 py-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-80" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
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
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── General tab ────────────────────────────────────────────────────── */}
      {tab === 'general' && (
        <div>
          <SettingsSection title="AI Configurations"
            description="Add a custom AI provider configuration. The default configuration is used for all AI features in this space.">

            {/* Existing configs */}
            {configurations.length > 0 && (
              <div className="space-y-3 mb-5">
                {configurations.map((cfg) => (
                  <div key={cfg.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cfg.name}</p>
                        {cfg.id === defaultConfigId && (
                          <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {PROVIDER_LABELS[cfg.provider_name] ?? cfg.provider_name} · {cfg.model_identifier}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditForm(cfg)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-700 rounded">
                        Edit
                      </button>
                      <button onClick={() => setDeleteConfigId(cfg.id)}
                        className="p-1 text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add config button */}
            {editingId === null && (
              <button onClick={openNewForm}
                className="flex items-center gap-2 px-3 py-2 text-sm text-teal-600 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20">
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

                {configError && <p className="mb-3 text-xs text-red-600 dark:text-red-400">{configError}</p>}

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input type="text" value={formName} onChange={(e) => { setFormName(e.target.value); setConfigFormIsDirty(true) }}
                    placeholder="e.g. Custom OpenAI" className={inputCls} />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Provider</label>
                  <SelectDropdown value={formProvider}
                    onChange={(v) => { setFormProvider(v ?? 'openai'); setFormModel(''); setConfigFormIsDirty(true) }}
                    options={providerOptions} />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  {modelOptions.length > 0 ? (
                    <SelectDropdown value={formModel} onChange={(v) => { setFormModel(v ?? ''); setConfigFormIsDirty(true) }}
                      options={modelOptions} placeholder="Select model..." />
                  ) : (
                    <input type="text" value={formModel} onChange={(e) => { setFormModel(e.target.value); setConfigFormIsDirty(true) }}
                      placeholder="Model identifier" className={inputCls} />
                  )}
                </div>

                {formProvider !== 'anthropic_bedrock' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      API Key {editingId !== 'new' && <span className="text-gray-400">(leave blank to keep existing)</span>}
                    </label>
                    <input type="password" value={formApiKey} onChange={(e) => { setFormApiKey(e.target.value); setConfigFormIsDirty(true) }}
                      placeholder="sk-..." className={inputCls} />
                  </div>
                )}

                {formProvider === 'anthropic_bedrock' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">AWS Region</label>
                      <input type="text" value={formAwsRegion} onChange={(e) => { setFormAwsRegion(e.target.value); setConfigFormIsDirty(true) }}
                        placeholder="us-east-1" className={inputCls} />
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">AWS Access Key ID</label>
                      <input type="text" value={formAwsKeyId} onChange={(e) => { setFormAwsKeyId(e.target.value); setConfigFormIsDirty(true) }}
                        className={inputCls} />
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        AWS Secret Access Key {editingId !== 'new' && <span className="text-gray-400">(leave blank to keep existing)</span>}
                      </label>
                      <input type="password" value={formAwsSecret} onChange={(e) => { setFormAwsSecret(e.target.value); setConfigFormIsDirty(true) }}
                        className={inputCls} />
                    </div>
                  </>
                )}

                <div className="flex gap-2 justify-end mt-4">
                  <button onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                    Cancel
                  </button>
                  <button onClick={handleSaveConfig} disabled={savingConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                    {savingConfig ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </SettingsSection>

          {deleteConfigId !== null && (
            <ConfirmModal open title="Delete Configuration"
              message="Are you sure you want to delete this AI configuration?"
              confirmLabel="Delete" dangerous
              onConfirm={() => handleDeleteConfig(deleteConfigId)}
              onCancel={() => setDeleteConfigId(null)} />
          )}
        </div>
      )}

      {/* ─── Branding tab ───────────────────────────────────────────────────── */}
      {tab === 'branding' && (
        <div>
          <div className="flex justify-end mb-6">
            <button onClick={handleSaveBranding} disabled={savingBranding}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg">
              <Check className="w-4 h-4" />
              {savingBranding ? 'Saving...' : savedBranding ? 'Saved' : 'Save'}
            </button>
          </div>
          {brandingError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{brandingError}</p>}

          <SettingsSection title="Business Context"
            description="Provides key background about your business to help the AI generate content that fits your brand's identity and goals.">
            <InputField label="Industry & Niche" maxLength={200} placeholder="Example: B2B SaaS for e-commerce brands."
              description="Specifies the sector (e.g., hospitality, fintech, retail) to adapt tone and language."
              value={branding.industry_niche} onChange={(v) => updateBranding((b) => ({ ...b, industry_niche: v }))} />
            <TextareaField label="Brand, Product, or Service" maxLength={1000} placeholder="Example: Analytics dashboard for small businesses."
              description="Brief description of what the business offers."
              value={branding.brand_product_service} onChange={(v) => updateBranding((b) => ({ ...b, brand_product_service: v }))} />
            <InputField label="Target Audience" maxLength={200} placeholder="Example: Independent restaurant owners, not tech-savvy."
              description="Defines who the message is for."
              value={branding.target_audience} onChange={(v) => updateBranding((b) => ({ ...b, target_audience: v }))} />
          </SettingsSection>

          <SettingsSection title="Brand Voice & Tone"
            description="Defines how your brand sounds—its personality, tone, and style.">
            <InputField label="Tone Guidelines" maxLength={200} placeholder="Example: Supportive and easygoing, but professional."
              description="Define the tone of the content."
              value={branding.tone_guidelines} onChange={(v) => updateBranding((b) => ({ ...b, tone_guidelines: v }))} />
            <InputField label="Writing Style" maxLength={200} placeholder="Example: Conversational with light humor, similar to Slack's style."
              description="Define the writing style of the content."
              value={branding.writing_style} onChange={(v) => updateBranding((b) => ({ ...b, writing_style: v }))} />
            <InputField label="Values or Personality Traits" maxLength={200} placeholder="Example: Innovative, trustworthy, customer-first."
              description="Define the values of your brand and personality traits."
              value={branding.values_or_personality_traits} onChange={(v) => updateBranding((b) => ({ ...b, values_or_personality_traits: v }))} />
          </SettingsSection>

          <SettingsSection title="Preferences"
            description="Defines what the AI should or shouldn't include—like specific words, tone, or formatting.">
            <InputField label="Formatting" maxLength={200} placeholder='Example: "Use short paragraphs", "Avoid all caps".'
              description="Define the output style rules for the generated content."
              value={branding.formatting} onChange={(v) => updateBranding((b) => ({ ...b, formatting: v }))} />
            <InputField label="Always Use" maxLength={200} placeholder='Example: "Our", "We", brand-specific terminology.'
              description="Terms, styles, or structures to always include."
              value={branding.always_use} onChange={(v) => updateBranding((b) => ({ ...b, always_use: v }))} />
            <InputField label="Commonly Use" maxLength={200} placeholder='Example: "Easy to use," "No credit card required."'
              description="Terms, styles, or structures to use frequently when appropriate."
              value={branding.commonly_use} onChange={(v) => updateBranding((b) => ({ ...b, commonly_use: v }))} />
            <InputField label="Avoid Use" maxLength={200} placeholder='Example: "Technical jargon", "Complicated setups"'
              description="Terms, styles, or structures to minimize or exclude."
              value={branding.avoid_use} onChange={(v) => updateBranding((b) => ({ ...b, avoid_use: v }))} />
            <InputField label="Never Use" maxLength={200} placeholder='Example: "Cheap," "ASAP," or overly pushy language.'
              description="Terms, styles, or structures that should be completely avoided."
              value={branding.never_use} onChange={(v) => updateBranding((b) => ({ ...b, never_use: v }))} />
          </SettingsSection>

          <SettingsSection title="Additional Information"
            description="Use this field to add any extra context, edge cases, or temporary notes that help the AI get things just right.">
            <TextareaField label="Markdown" maxLength={1000} rows={6}
              placeholder="Add any extra context in markdown format..."
              value={branding.additional_guidelines} onChange={(v) => updateBranding((b) => ({ ...b, additional_guidelines: v }))} />
          </SettingsSection>
        </div>
      )}

      <UnsavedChangesModal open={showUnsavedModal} onConfirm={confirmUnsaved} onCancel={cancelUnsaved} />
    </div>
  )
}
