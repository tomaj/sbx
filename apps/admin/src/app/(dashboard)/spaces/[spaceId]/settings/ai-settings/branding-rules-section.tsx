'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { SettingsSection } from '@/components/ui/settings-section';
import { FormField, inputCls } from '@/components/ui/form-field';
import { useApi } from '@/lib/swr';
import type { AiBrandingRule } from './types';
import { EMPTY_BRANDING } from './types';

export function BrandingRulesSection({
  spaceId,
  onDirtyChange,
}: {
  spaceId: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic config
  const { data: brandingData, mutate: mutateBranding } = useApi<any>(
    `/api/admin/spaces/${spaceId}/ai-branding-rules`,
  );

  const [branding, setBranding] = useState<AiBrandingRule>(EMPTY_BRANDING);
  const [brandingInitialized, setBrandingInitialized] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savedBranding, setSavedBranding] = useState(false);
  const [brandingError, setBrandingError] = useState<string | null>(null);

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

  function updateBranding(updater: (b: AiBrandingRule) => AiBrandingRule) {
    setBranding(updater);
    onDirtyChange(true);
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
      onDirtyChange(false);
      setSavedBranding(true);
      setTimeout(() => setSavedBranding(false), 2000);
      // biome-ignore lint/suspicious/noExplicitAny: dynamic config
    } catch (e: any) {
      setBrandingError(e.message);
    } finally {
      setSavingBranding(false);
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          type="button"
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
  );
}
