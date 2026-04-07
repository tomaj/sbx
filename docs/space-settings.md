# Space Settings — Dokumentácia

Prehľad všetkých nastavení dostupných pod `Settings` v rámci Spacu. Pre každú sekciu: čo ponúka, kde sa ukladá, a ako je implementované.

---

## Navigácia (layout)

```
/spaces/[spaceId]/settings/
  space/               → General space settings
  visual-editor/       → Visual Editor settings
  asset-library/       → Asset Library settings
  webhooks/            → Webhook endpoints + logs
  ai-settings/         → AI provider configs + branding
  internationalization/ → Coming soon
  maintenance-mode/    → Maintenance mode toggle
  access-tokens/       → API tokens (CRUD)
  users/               → Space members
  roles/               → Space roles
  workflows/           → Workflow definitions
  pipelines/           → Pipelines (CI/CD hooks)
  history/             → Audit log
```

---

## 1. Space (General)

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/space/page.client.tsx`

### Polia

| Pole v UI | API field | DB column | Typ | Popis |
|-----------|-----------|-----------|-----|-------|
| Space Name | `name` | `spaces.name` | `text NOT NULL` | Názov spacu, max 100 znakov |
| Space ID | — | `spaces.id` | `integer PK` | Read-only, zobrazuje sa pre support tickety |
| Server Location | — | — | — | Hardcoded "EU", bez DB stĺpca |
| Default content type | `default_root` | `spaces.default_root` | `text NULL` | Meno komponentu predvolene vybraného pri vytváraní novej story |

### Ukladanie

```
Admin PATCH /api/admin/spaces/{spaceId}/space
  → catch-all proxy → MAPI PUT /v1/spaces/{spaceId}
  → body: { space: { name, default_root } }
```

### Implementácia

- `name` — ✅ plne implementované
- `default_root` — ✅ ukladá sa, vracia cez API, **a** je importovaný zo seed golden dát. Create-story-panel ho číta a predvolí vybraný content type pri otvorení.

---

## 2. Visual Editor

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/visual-editor/page.client.tsx`

### Polia

| Pole v UI | API field | DB column | Typ | Default |
|-----------|-----------|-----------|-----|---------|
| Location (default env) | `domain` | `spaces.domain` | `text NULL` | — |
| Encode Preview URLs | `encode_url` | `spaces.encode_url` | `boolean` | `false` |
| Preview URLs (zoznam) | `preview_urls` | `spaces.preview_urls` | `json[]` | `[]` |
| Mobile width in px | `mobile_width` | `spaces.mobile_width` | `integer` | `360` |
| Disable Visual Editor | `visual_editor_disabled` | `spaces.visual_editor_disabled` | `boolean` | `false` |

`preview_urls` je pole objektov `{ name: string; location: string }`. API alias `environments` mapuje na ten istý DB stĺpec (Storyblok kompatibilita).

### Ukladanie

```
Admin PATCH /api/admin/spaces/{spaceId}/space
  → MAPI PUT /v1/spaces/{spaceId}
  → body: { space: { domain, preview_urls, encode_url, mobile_width, visual_editor_disabled } }
```

### Implementácia

| Pole | Stav | Kde sa používa |
|------|------|----------------|
| `domain` | ✅ plne | Story editor ho číta ako default preview URL |
| `preview_urls` | ✅ plne | Story editor ich zobrazuje ako prepínač prostredí |
| `mobile_width` | ✅ plne | Story editor nastaví iframe šírku mobile preview |
| `encode_url` | ✅ plne | Story editor: keď `true`, zachová URL-encoded `%5B`/`%5D` v query string preview URL; keď `false` (default), použije raw `[`/`]` |
| `visual_editor_disabled` | ✅ plne | Story editor: keď `true`, vždy len form view — vypnuté na space úrovni, nedá sa per-story prepnúť |

---

## 3. Asset Library

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/asset-library/page.client.tsx`

### Polia

Všetky nastavenia sa ukladajú ako JSON blob do `spaces.asset_library_settings`.

#### Default metadata fields

Štyri predvolené metadata polia, každé s dvomi flagmi:

| Pole | Default |
|------|---------|
| Alt Text (`altText`) | `{ required: true, translatable: false }` |
| Title/Caption (`titleCaption`) | `{ required: true, translatable: false }` |
| Copyright (`copyright`) | `{ required: false, translatable: false }` |
| Source (`source`) | `{ required: false, translatable: false }` |

#### Custom metadata fields

Storyblok-kompatibilná schéma uložená v `assetLibrarySettings.customMetadataFields`:

```typescript
{
  key: string;          // identifikátor poľa (napr. "dlzka_dokumentu")
  required: boolean;
  filetypes: string[];  // ['any'] | subset of ['images','videos','audios','texts']
  translatable: boolean;
}
```

Hodnoty custom polí sa ukladajú priamo do `asset.meta_data[key]` — napr. `meta_data.dlzka_dokumentu = "..."`.

#### Assets size limits

| Kľúč v JSON | Typ | Default | Popis |
|-------------|-----|---------|-------|
| `uploadLimitMb` | `number` | `5` | Max veľkosť súboru v MB |

### Ukladanie

```
Admin PATCH /api/admin/spaces/{spaceId}/space
  → body: { space: { asset_library_settings: { ... } } }
```

### Implementácia

| Setting | Stav | Poznámka |
|---------|------|----------|
| `defaultMetadataFields` | ⚠️ uložené, nevynucované | Ukladá sa do DB, ale asset upload endpoint nevaliduje required/translatable |
| `customMetadataFields` | ✅ plne | Ukladá sa, zobrazuje sa v asset detail modali pre zodpovedajúci typ súboru, hodnoty v `meta_data` |
| `uploadLimitMb` | ⚠️ len client-side | API nevynucuje — len client-side validácia v UI |

---

## 4. Webhooks

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/webhooks/page.client.tsx`

Webhooke sú vlastná tabuľka `webhook_endpoints`, nie pole v `spaces`.

### Polia webhook endpointu

| Pole | Typ | Popis |
|------|-----|-------|
| `name` | `string` | Názov pre identifikáciu |
| `endpoint` | `string (URL)` | Cieľová URL |
| `description` | `string` | Voliteľný popis |
| `secret` | `string` | HMAC-SHA256 signing secret |
| `actions` | `string[]` | Zoznam triggerov (viď nižšie) |
| `activated` | `boolean` | Zapnutý/vypnutý |

### Trigger actions

```
story.published         story.unpublished       story.deleted           story.moved
datasource.entries_updated
asset.created           asset.replaced          asset.deleted           asset.restored
user.added              user.removed            user.roles_updated
stage.changed
pipeline.deployed
release.merged
```

### Implementácia

- ✅ **Plne implementované** — CRUD funguje, signing cez HMAC-SHA256 (`X-Webhook-Signature: sha256={hex}` + `X-Webhook-Timestamp`), dispatch cez BullMQ `WebhooksProcessor` s retry
- ✅ **Logs** — `webhook_logs` tabuľka, zobrazuje sa v `/settings/webhooks/logs`, retry akcia

---

## 5. AI Settings

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/ai-settings/page.client.tsx`

### Tab: General (AI Configurations)

Ukladá sa do `spaces.ai_settings` (JSON).

| Pole | Typ | Popis |
|------|-----|-------|
| `name` | `string` | Názov konfigurácie |
| `provider_name` | `'openai' \| 'anthropic' \| 'anthropic_bedrock' \| 'gemini'` | AI provider |
| `model_identifier` | `string` | Model ID |
| `api_key` | `string` | API kľúč — **nikdy sa nevracia** v GET |
| `settings.aws_region` | `string` | Pre Bedrock |
| `settings.aws_access_key_id` | `string` | Pre Bedrock — **nikdy sa nevracia** |
| `settings.aws_secret_access_key` | `string` | Pre Bedrock — **nikdy sa nevracia** |

### Tab: Branding

| Pole | Max | Popis |
|------|-----|-------|
| `industry_niche` | 200 | Odvetvie |
| `brand_product_service` | 1000 | Popis produktu/služby |
| `target_audience` | 200 | Cieľová skupina |
| `tone_guidelines` | 200 | Tón komunikácie |
| `writing_style` | 200 | Štýl písania |
| `values_or_personality_traits` | 200 | Hodnoty a osobnosť |
| `formatting` | 200 | Pravidlá formátovania |
| `always_use` | 200 | Vždy použiť |
| `commonly_use` | 200 | Bežne použiť |
| `avoid_use` | 200 | Minimalizovať |
| `never_use` | 200 | Nikdy nepoužiť |
| `additional_guidelines` | 1000 | Doplnkový markdown kontext |

### Implementácia

- ✅ CRUD konfiguráciám funguje
- ✅ Branding rules sa ukladajú
- ⚠️ AI konfigurácie a branding sú **zatiaľ len uložené** — žiadny existujúci endpoint ich aktívne nepoužíva na generovanie obsahu

---

## 6. Internationalization

**Stav: Coming soon** — stránka zobrazuje placeholder.

### Súvisiace DB polia (existujú, len bez UI)

| DB column | Typ | Popis |
|-----------|-----|-------|
| `spaces.default_lang` | `text DEFAULT 'default'` | Kód predvoleného jazyka |
| `spaces.language_codes` | `json DEFAULT []` | Pole kódov podporovaných jazykov |

Vracajú sa cez CDN `/v2/cdn/spaces/me` — klienti ich používajú pre i18n routing.

---

## 7. Maintenance Mode

**Admin UI:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/maintenance-mode/`

### Pole

| Pole v UI | API field | DB column | Typ | Default |
|-----------|-----------|-----------|-----|---------|
| Enable maintenance mode | `maintenance_mode` | `spaces.maintenance_mode` | `boolean` | `false` |

### Ukladanie

```
Admin PATCH /api/admin/spaces/{spaceId}/space
  → body: { space: { maintenance_mode: boolean } }
```

### Implementácia

- ✅ **Plne implementované**
- Backend: `MaintenanceModeGuard` (`apps/api/src/shared/maintenance-mode.guard.ts`) aplikovaný na `StoriesController` a `ComponentsController`
  - Blokuje POST/PUT/PATCH/DELETE
  - Kontroluje `spaceMembers.role === 'admin'`
  - Non-admins dostanú `403 Forbidden: Space is in maintenance mode`
- UI: amber banner zobrazený v content zozname aj v story editore
- Settings page: toggle s okamžitým uložením

---

## 8. Access Tokens

Vlastná tabuľka `api_tokens` (nie pole v `spaces`).

Endpointy: `GET/POST/DELETE /v1/spaces/{spaceId}/api_keys`

---

## 9. Users / Roles / Workflows / Pipelines

Vlastné tabuľky, nie súčasť `spaces` objektu:

| Sekcia | Tabuľka | Endpoint |
|--------|---------|----------|
| Users | `space_members` | `/v1/spaces/{id}/collaborators` |
| Roles | `space_roles` | `/v1/spaces/{id}/space_roles` |
| Workflows | `workflows`, `workflow_stages` | `/v1/spaces/{id}/workflows` |
| Pipelines | `pipelines` | `/v1/spaces/{id}/pipelines` |

---

## Súhrnná tabuľka implementácie

| Setting | DB | API | UI | Enforcement |
|---------|----|-----|----|-------------|
| name | ✅ | ✅ | ✅ | ✅ plne |
| default_root | ✅ | ✅ | ✅ | ✅ create-story-panel ho predvolí |
| domain | ✅ | ✅ | ✅ | ✅ story editor ho číta |
| preview_urls | ✅ | ✅ | ✅ | ✅ story editor ich zobrazuje |
| mobile_width | ✅ | ✅ | ✅ | ✅ story editor nastaví iframe šírku |
| encode_url | ✅ | ✅ | ✅ | ✅ story editor aplikuje/neaplikuje URL encoding |
| visual_editor_disabled | ✅ | ✅ | ✅ | ✅ story editor vždy len form view |
| asset_library.defaultMetadataFields | ✅ | ✅ | ✅ | ⚠️ asset upload nevynucuje |
| asset_library.customMetadataFields | ✅ | ✅ | ✅ | ✅ zobrazuje sa v asset detail, ukladá do meta_data |
| asset_library.uploadLimitMb | ✅ | ✅ | ✅ | ⚠️ len client-side validácia |
| webhooks | ✅ | ✅ | ✅ | ✅ plne (BullMQ dispatch) |
| ai_configurations | ✅ | ✅ | ✅ | ⚠️ uložené, AI generation neimplementovaná |
| ai_branding_rules | ✅ | ✅ | ✅ | ⚠️ uložené, AI generation neimplementovaná |
| default_lang | ✅ | ✅ | ❌ | ✅ CDN /spaces/me vracia |
| language_codes | ✅ | ✅ | ❌ | ✅ CDN /spaces/me vracia |
| maintenance_mode | ✅ | ✅ | ✅ | ✅ backend 403 pre non-admins |

---

## MAPI — space update endpoint

```
PUT /v1/spaces/{id}
Authorization: Bearer <management_token>

{
  "space": {
    "name": "string",
    "domain": "string | null",
    "default_lang": "string",
    "default_root": "string | null",
    "preview_urls": [{ "name": "string", "location": "string" }],
    "environments": [{ "name": "string", "location": "string" }],  // alias pre preview_urls
    "encode_url": boolean,
    "mobile_width": number,
    "visual_editor_disabled": boolean,
    "asset_library_settings": object,
    "maintenance_mode": boolean,
    "story_published_hook": "string | null"   // prijatý, ale ignorovaný (nie je v DB)
  }
}
```
