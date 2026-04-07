# Components (Blocks) — kompletná dokumentácia

Dokumentácia všetkých nastavení, UI elementov a implementačného stavu pre Block Library v SBX admin UI.

**Rozdelenie:**
1. [Všeobecné nastavenia komponentu](#1-všeobecné-nastavenia-komponentu) — vlastnosti samotného bloku (config, preview, tags, icon...)
2. [Nastavenia fieldov](#2-nastavenia-fieldov) — per-typ fieldu aké options má vo field editore + stav implementácie v story editore
3. [MAPI endpointy](#3-mapi-endpointy)
4. [DB schéma](#4-db-schéma)

Legenda stavu:
- ✅ **Implementované** — UI + backend + runtime použitie (story editor, block list, atď.)
- ⚠️ **Čiastočne** — ukladá sa, niektoré časti fungujú, iné nie
- ❌ **Len persistencia** — UI umožňuje nastaviť, do DB sa uloží, ale runtime to ignoruje

---

# 1. Všeobecné nastavenia komponentu

## 1.1 Block Library toolbar

| UI element | Akcia | MAPI | Stav |
|------------|-------|------|------|
| Search input | Hľadanie podľa `name` / `display_name` | `GET /components?search=` | ✅ |
| Sort dropdown | Name A-Z / Updated newest | `GET /components?sort_by=name:asc` | ✅ |
| New Block | Otvorí CreateBlockModal | — | ✅ |
| New Folder | Otvorí CreateGroupModal | — | ✅ |
| Multiselect checkbox | Výber blokov pre bulk akcie | — | ✅ |

## 1.2 Bulk akcie

| Akcia | MAPI | Stav |
|-------|------|------|
| Duplicate | `POST /components/:id/duplicate` (pre každý) | ✅ |
| Copy JSON | clipboard `[{name, display_name}]` | ✅ |
| Move to folder | `PUT /components/:id` s `{component_group_uuid}` | ✅ |
| Delete (cez ConfirmModal) | `DELETE /components/:id` (pre každý) | ✅ |

## 1.3 Skupiny blokov (ľavý sidebar)

| UI | Akcia | MAPI | Stav |
|----|-------|------|------|
| "All blocks" pin | Reset filtra | — | ✅ |
| "Tags" pin | Prepne na tags view | — | ✅ |
| Folder tree | Hierarchické skupiny s počtom blokov | `GET /component_groups` | ✅ |
| Create subgroup | Context menu | `POST /component_groups` `{name, parent_id}` | ✅ |
| Rename | Context menu | `PUT /component_groups/:id` `{name}` | ✅ |
| Delete | Context menu | `DELETE /component_groups/:id` | ✅ |

## 1.4 Tags view

| UI | Akcia | MAPI | Stav |
|----|-------|------|------|
| Tag list | Zobrazuje tagy s počtom | `GET /internal_tags?by_object_type=component` | ✅ |
| Create | `+` button | `POST /internal_tags` `{name, object_type: 'component'}` | ✅ |
| Rename | Inline edit | `PUT /internal_tags/:id` | ✅ |
| Delete | ConfirmModal | `DELETE /internal_tags/:id` | ✅ |

## 1.5 CreateBlockModal — formulár pri vytváraní

| Pole | Typ | Required | Ukladá sa | Stav |
|------|-----|----------|-----------|------|
| Technical name | text | ✅ | `name` | ✅ |
| Description | text | ❌ | `description` | ✅ |
| Block type | radio group (3 options) | ✅ | `is_root` + `is_nestable` | ✅ |
| Block Folder | select dropdown | ❌ | `component_group_uuid` | ✅ |

**Block type popisy (zhodné v create modal aj config tab):**
- **Nestable block** — "e.g. Hero, Grid, Section, Newsletter Section, Chapter, Full Width Image, Slider..."
- **Content type block** — "e.g. Landing pages, Post, Authors, Product, Page, Team Members, FAQ article..."
- **Universal block** — "Block that can be used as content type block and nested block at same time."

| Block type | `is_root` | `is_nestable` | Kde sa používa |
|------------|-----------|---------------|----------------|
| Nestable | false | true | Vnoriteľný v bloks fieldoch |
| Content type | true | false | Root bloky pre stories (dropdown v create-story-panel filtruje `is_root: true`) |
| Universal | true | true | Oba prípady |

**Stav:** ✅ Implementované a vynucované — `create-story-panel.tsx:172` filtruje komponenty podľa `is_root`.

**MAPI:** `POST /v1/spaces/:spaceId/components` s body `{component: {name, description, is_nestable, is_root, component_group_uuid}}`

## 1.6 EditBlockModal — záložky

| Záložka | Popis | Stav |
|---------|-------|------|
| **Fields** | Editor fieldov komponentu (viď sekcia 2) | ✅ |
| **Config** | Metadata, preview, icon, tags (viď nižšie) | ✅ |
| **Presets** | List, create, edit, delete, duplicate | ✅ Plne implementované |
| **Versions** | Verzia history + restore | ✅ |
| **Conditions** | Centralized field conditions editor | ✅ Plne implementované |

## 1.7 Config tab — nastavenia komponentu

Tabuľka všetkých polí v Config tab (v poradí zhora nadol ako v UI).

| Pole | UI element | Schema/DB key | Popis | Stav |
|------|-----------|--------------|-------|------|
| **Display name** | text input | `display_name` | Human-readable názov zobrazený v editore a block liste | ✅ |
| **Description** | text input | `description` | Popis pre editorov | ✅ Zobrazuje sa ako tooltip |
| **Block type** | radio group (3 options) | `is_root` + `is_nestable` | Nestable / Content type / Universal | ✅ Vynucované v story creation |
| **Block Folder** | select dropdown | `component_group_uuid` | Zaradenie do skupiny | ✅ |
| **Tags** | TagsMultiselect | `internal_tags_list` + `internal_tag_ids` | Interné tagy pre filtrovanie | ✅ |
| **Preview field** | select dropdown | `preview_field` | Field zobrazený ako preview text v block liste (len typy `text`, `textarea`, `option`, `number`, `markdown`) | ✅ Vyhodnocuje `bloks-field.tsx` (fn `getBlockPreview`) |
| **Preview card** | select dropdown | `content_type_asset_preview` | Field zobrazený v story card v stories liste | ✅ API join s components tabulkou + extrakcia z content JSONB → `preview_asset` v story liste. UI: thumbnail (40×30px) v Name stĺpci. |
| **Preview template** | textarea (HTML + `{{ it.fieldName }}`) | `preview_tmpl` | HTML šablóna pre preview vnoreného bloku | ✅ Vyhodnocuje `bloks-field.tsx` (fn `renderPreviewTmpl`) — podporuje `{{ it.field }}`, `{{ it.array.length }}`, `{{ @image(it.field) }}` |
| **Preview screenshot** | AssetField uploader | `image` | Obrázkový screenshot zobrazený pri hover v block liste | ✅ |
| **Block icon — color** | 10 preset color picker | `color` | Hex farba ikony | ✅ |
| **Block icon — icon** | 41-icon grid (Lucide) | `icon` | Ikona bloku | ✅ |

**PATCH payload (všetky keys):**
```json
{
  "schema": {...},
  "display_name": "Hero",
  "description": "...",
  "is_nestable": true,
  "is_root": false,
  "component_group_uuid": "uuid",
  "preview_field": "title",
  "content_type_asset_preview": "cover_image",
  "preview_tmpl": "<div>...</div>",
  "internal_tags_list": [{"id": 1, "name": "marketing"}],
  "internal_tag_ids": ["1"],
  "color": "#3b82f6",
  "icon": "layout-dashboard",
  "image": "http://cdn.../screenshot.png"
}
```
Admin proxy to wrapuje do `{component: body}` a volá `PUT /v1/spaces/:spaceId/components/:id`.

## 1.8 Versions tab

| UI | Akcia | MAPI | Stav |
|----|-------|------|------|
| Version list (50/stránka) | Zobrazenie histórie | `GET /v1/spaces/:spaceId/versions?model=components&model_id=:id` | ✅ |
| Preview button | Side panel s read-only schema | `GET /components/:id/component_versions/:vid` | ✅ |
| Restore button | Obnovenie verzie (cez ConfirmModal) | `PUT /components/:id/versions/:vid/restore` | ✅ |
| Compare view | Porovnanie dvoch verzií | — | ❌ "Coming soon" |

Verzia sa vytvára automaticky pri `createComponent` (event `create`) a `updateComponent` (event `update`). Ukladá sa snapshot celej schémy + autor.

---

# 2. Nastavenia fieldov

Každý field je v schema uložený ako `{ [fieldKey]: { type, display_name, required, ... } }`. Field sa edituje cez side panel FieldEditor otvorený kliknutím na field row v Fields tab.

## 2.1 Spoločné nastavenia (všetky typy)

Všetky field typy rozširujú `BaseFieldDef`:

| Option | UI | Schema key | Popis | Stav v story editore |
|--------|-----|-----------|-------|---------------------|
| **Display name** | text input | `display_name` | Zobrazovaný label nad inputom | ✅ |
| **Description** | textarea | `description` | Nápoveda pod labelom | ✅ |
| **Required** | toggle | `required` | Povinné pole | ✅ Validuje sa pri save |
| **Translatable** | toggle | `translatable` | Preložiteľné pole | ❌ i18n pipeline neexistuje, flag sa len ukladá |
| **Default value** | závisí od typu | `default_value` | Predvolená hodnota | ✅ Apply pri vytváraní noveho fieldu/bloku |
| **Tooltip** | toggle | `tooltip` | Zobraziť description ako tooltip | ⚠️ Ukladá sa, rendering tooltipu je inconsistentný |
| **Conditions** | `FieldConditionsSection` v FieldEditor | `conditions` | Podmienečná viditeľnosť (validation `any/all` + `rule_conditions` s operátormi `empty/not_empty/equal/not_equal/greater/less`) | ✅ UI existuje, runtime evaluácia v `field-conditions.ts` filtruje fieldy v EditTab aj v nested BlockFields |

---

## 2.2 `text` — jednoriadkový text

| Option | UI element | Schema key | Stav |
|--------|-----------|-----------|------|
| RTL | toggle | `rtl` | ✅ `text-field.tsx` nastavuje `dir="rtl"` |
| Maximum characters | number input | `max_length` | ✅ `text-field.tsx` — natívny `maxLength` + character counter |
| Regex validation | text input | `regex` | ✅ Runtime validation — zobrazuje inline error pod inputom |
| Default value | text input | `default_value` | ✅ |

**Rendering:** `apps/admin/src/components/story-editor/fields/text-field.tsx`

---

## 2.3 `textarea` — viacriadkový text

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| RTL | toggle | `rtl` | ✅ `textarea-field.tsx` |
| Maximum characters | number input | `max_length` | ✅ Counter + natívny maxLength |
| Regex validation | text input | `regex` | ✅ Runtime validation — inline error |
| Default value | textarea | `default_value` | ✅ |

**Rendering:** `apps/admin/src/components/story-editor/fields/textarea-field.tsx`

---

## 2.4 `richtext` — WYSIWYG editor

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Maximum characters | number input | `max_length` | ✅ Character counter pod editorom (plain text length) |
| Customize toolbar | toggle | `customize_toolbar` | ❌ Toolbar je fixný |
| Toolbar items | multiselect | `toolbar` | ❌ Ukladá sa, ignoruje sa |
| Custom class | text input | `custom_class` | ✅ Pripojené k `EditorContent` className |
| Default value | textarea | `default_value` | ⚠️ Nastavuje sa, ale iba plain text |

**Rendering:** `apps/admin/src/components/story-editor/fields/richtext-field.tsx`

---

## 2.5 `markdown` — Markdown editor

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| RTL | toggle | `rtl` | ✅ `markdown-field.tsx` nastavuje `dir="rtl"` |
| Rich text as default | toggle | `rich_text_as_default` | ❌ Ukladá sa, ignoruje sa |
| Allow empty paragraphs | toggle | `allow_empty_paragraphs` | ❌ Ukladá sa, ignoruje sa |
| Customize toolbar | toggle | `customize_toolbar` | ❌ Ukladá sa, toolbar je fixný |
| Maximum characters | number | `max_length` | ✅ Natívny maxLength + counter |

**Rendering:** `apps/admin/src/components/story-editor/fields/markdown-field.tsx`

---

## 2.6 `number` — číselný input

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Minimum value | number | `min_value` | ✅ `number-field.tsx:26` natívny `min` |
| Maximum value | number | `max_value` | ✅ `number-field.tsx:27` natívny `max` |
| Decimals | number | `decimals` | ✅ Deriváciou cez `step = 10^-decimals` |
| Steps | number | `steps` | ✅ `number-field.tsx:28` natívny `step` |
| Default value | number input | `default_value` | ✅ |

**Rendering:** `apps/admin/src/components/story-editor/fields/number-field.tsx`

---

## 2.7 `datetime` — dátum/čas

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Disable time | toggle | `disable_time` | ✅ `datetime-field.tsx:16` prepína medzi `type="date"` a `type="datetime-local"` |
| Default value | datetime input | `default_value` | ✅ |

**Rendering:** `apps/admin/src/components/story-editor/fields/datetime-field.tsx`

---

## 2.8 `boolean` — toggle/checkbox

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Inline label | toggle | `inline_label` | ✅ Keď true, label sa renderuje vpravo od switchu |
| Default value | toggle | `default_value` | ✅ |

**Rendering:** `apps/admin/src/components/story-editor/fields/boolean-field.tsx`

---

## 2.9 `option` — single-select

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| **Source** | radio | `source` | ✅ Podporované: `self`, `internal`, `internal_stories`, `internal_languages`, `external_datasource` |
| Options (pre `self`) | key-value editor | `options` `[{name, value}]` | ✅ |
| Exclude empty option | toggle | `exclude_empty_option` | ✅ Dropdown nezobrazuje "None" placeholder |
| **Datasource slug** (pre `internal`) | select | `datasource_slug` | ✅ `option-field.tsx:47` |
| **Filter content type** (pre `internal_stories`) | text/multiselect | `filter_content_type` | ✅ `option-field.tsx:86` |
| Use UUID | toggle | `use_uuid` | ✅ `option-field.tsx:87` |
| Link scope | text | `link_scope` | ⚠️ Ukladá sa, nejasne napojené |
| Appearance | radio (`link`/`card`) | `appearance` | ✅ `link` = radio buttony, `card` = card grid, default = dropdown |
| **External datasource URL** (pre `external_datasource`) | text | `external_datasource` | ✅ Client-side fetch z URL, parses `{options:[{name,value}]}` alebo `[{name,value}]`, renders ako SelectDropdown. Error state ak fetch zlyhá. |

**Rendering:** `apps/admin/src/components/story-editor/fields/option-field.tsx`

---

## 2.10 `options` — multi-select

Rovnaké ako `option` plus:

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Min options | number | `min` | ✅ Runtime validation — inline error |
| Max options | number | `max` | ✅ Runtime validation — inline error |

**Rendering:** `apps/admin/src/components/story-editor/fields/options-field.tsx`

---

## 2.11 `multilink` (References)

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| **Enable advanced search** | toggle | `enable_advanced_search` | ✅ Keď `false`, search input v story pickeri sa skryje (default: `true`). `story-link-tab.tsx`. |
| **Restrict content types** | toggle | `restrict_content_types` | ✅ Story browser filtruje |
| **Content type whitelist** | multiselect | `component_whitelist` | ✅ |
| **Force link scope** | toggle | `force_link_scope` | ✅ Keď `true` + `link_scope` nastavený: breadcrumb root je vizuálne zamknutý (ikona zámku + scope label), `starts_with` vždy aplikovaný. `story-link-tab.tsx`. |
| **Link scope** | text | `link_scope` | ✅ `starts_with` filter v story browseri |
| **Allow target blank** | toggle | `allow_target_blank` | ✅ |
| **Show anchor** | toggle | `show_anchor` | ✅ Anchor input |
| **Asset link type** | toggle | `asset_link_type` | ✅ |
| **Email link type** | toggle | `email_link_type` | ✅ |
| **Allow custom attributes** | toggle | `allow_custom_attributes` | ✅ Key/value editor |

**Rendering:** `apps/admin/src/components/story-editor/fields/link-field.tsx` — zdieľaný s `link` typom. Väčšina options funguje.

---

## 2.12 `asset` — jeden asset

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Allow external URL | toggle | `allow_external_url` | ✅ "Or use external URL" link pod pickerom → URL input |
| Filetypes | multiselect (images/videos/audios/texts) | `filetypes` | ✅ Asset picker filtruje podľa content_type |
| Asset folder | select | `asset_folder_id` | ✅ Asset picker sa otvorí v danom foldri |

**Rendering:** `apps/admin/src/components/story-editor/fields/asset-field.tsx`

---

## 2.13 `multiasset` — viacero assetov

Rovnaké options ako `asset`. Filetypes + folder ✅, `allow_external_url` ✅.

**Rendering:** `apps/admin/src/components/story-editor/fields/multiasset-field.tsx`

---

## 2.14 `link` — link input

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| **Link scope** | text | `link_scope` | ✅ Pri vyhľadávaní stories sa aplikuje `starts_with` filter |
| **Force link scope** | toggle | `force_link_scope` | ✅ Keď `true` + `link_scope` nastavený: breadcrumb root je vizuálne zamknutý (ikona zámku + scope label), `starts_with` vždy aplikovaný. `story-link-tab.tsx`. |
| **Restrict content types** | toggle | `restrict_content_types` | ✅ Story browser filtruje podľa whitelist-u |
| **Content type whitelist** | multiselect | `component_whitelist` | ✅ Prvá položka sa použije ako `content_type` filter |
| **Allow target blank** | toggle | `allow_target_blank` | ✅ |
| **Show anchor** | toggle | `show_anchor` | ✅ Anchor input sa zobrazí pre story a URL link |
| **Asset link type** | toggle | `asset_link_type` | ✅ |
| **Email link type** | toggle | `email_link_type` | ✅ |
| **Allow custom attributes** | toggle | `allow_custom_attributes` | ✅ Key/value editor pod linkom |

**Rendering:** `apps/admin/src/components/story-editor/fields/link-field.tsx`

---

## 2.15 `bloks` — vnorené bloky

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| **Restrict components** | toggle | `restrict_components` | ✅ |
| Restrict type | (auto-derived, bez UI) | `restrict_type` | ✅ Auto-derivovaný pri každej zmene filtra v `bloks-options.tsx`: `'groups'` ak sú nastavené len group filtre (bez component name filtrov), inak `''`. Ukladá sa pre Storyblok API kompatibilitu. Runtime v `bloks-field.tsx` aplikuje všetky filtre simultánne (superset Storyblok správania). |
| **Component whitelist** | multiselect | `component_whitelist` | ✅ |
| **Component denylist** | multiselect | `component_denylist` | ✅ |
| **Group whitelist** | multiselect | `component_group_whitelist` | ✅ Filtruje podľa `component_group_uuid` |
| **Group denylist** | multiselect | `component_group_denylist` | ✅ |
| **Tag whitelist** | multiselect | `component_tag_whitelist` | ✅ Filtruje podľa `internal_tags_list` |
| **Tag denylist** | multiselect | `component_tag_denylist` | ✅ |
| **Minimum** | number | `minimum` | ✅ Inline warning keď count < minimum |
| **Maximum** | number | `maximum` | ✅ Tlačidlo "Add" sa disable-uje + counter `N / max` |

**Rendering:** `apps/admin/src/components/story-editor/fields/bloks-field.tsx`

---

## 2.16 `section` (Group) — zoskupenie fieldov

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Keys | multiselect field names | `keys` | ✅ Vizuálne zoskupuje vybrané fieldy |

Section nemá žiadne vlastné value — je to len kontajner.

---

## 2.17 `table` — tabuľka

Žiadne typ-špecifické nastavenia. Používa sa ako jednoduchá editovateľná tabuľka.

**Rendering:** `apps/admin/src/components/story-editor/fields/table-field.tsx`

---

## 2.18 `tab` — štrukturálny tab separator

Štrukturálny typ bez vlastných hodnôt. Organizuje fieldy do tabov v story editore.

- **Nie je user-addable** cez štandardný type picker — spravuje sa cez "Manage Tabs" tlačidlo v Fields tabe
- **Žiadny renderer** — existencia `tab` fieldu v schéme spôsobí vznik nového tabu v story editore
- **Žiadne typ-špecifické nastavenia** — len `display_name` (názov tabu)
- Fieldy "patria" tabu podľa poradia v schéme (fieldy za `tab` fieldом až po ďalší `tab` field)

**Implementácia:** `apps/admin/src/components/story-editor/edit-tab.tsx` — pri renderovaní editora sa schéma prechádza a rozdeľuje na tab sekcie.

## 2.19 `custom` — custom field type (plugin)

| Option | UI | Schema key | Stav |
|--------|-----|-----------|------|
| Field type name | text/select | `field_type` | ⚠️ Wire-up len čiastočné |
| Options | JSON | `options` | ⚠️ |

Implementácia závisí od toho či organizácia má definovaný field type v admin settings (`/v1/admin/field-types`).

---

# 3. MAPI endpointy

## Components

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/v1/spaces/:spaceId/components` | List + filter + sort |
| GET | `/v1/spaces/:spaceId/components/:id` | Detail |
| POST | `/v1/spaces/:spaceId/components` | Create |
| PUT | `/v1/spaces/:spaceId/components/:id` | Update (admin UI posiela cez PATCH proxy) |
| DELETE | `/v1/spaces/:spaceId/components/:id` | Delete |
| POST | `/v1/spaces/:spaceId/components/:id/duplicate` | Duplikácia |

## Component Groups

| Metóda | Endpoint |
|--------|----------|
| GET | `/v1/spaces/:spaceId/component_groups` |
| GET | `/v1/spaces/:spaceId/component_groups/:id` |
| POST | `/v1/spaces/:spaceId/component_groups` |
| PUT | `/v1/spaces/:spaceId/component_groups/:id` |
| DELETE | `/v1/spaces/:spaceId/component_groups/:id` |

## Versions

| Metóda | Endpoint |
|--------|----------|
| GET | `/v1/spaces/:spaceId/versions?model=components&model_id=:id&page&per_page` |
| GET | `/v1/spaces/:spaceId/components/:id/component_versions/:vid` |
| PUT | `/v1/spaces/:spaceId/components/:id/versions/:vid/restore` |

## Internal Tags

| Metóda | Endpoint |
|--------|----------|
| GET | `/v1/spaces/:spaceId/internal_tags?by_object_type=component` |
| POST | `/v1/spaces/:spaceId/internal_tags` |
| PUT | `/v1/spaces/:spaceId/internal_tags/:id` |
| DELETE | `/v1/spaces/:spaceId/internal_tags/:id` |

---

# 4. DB schéma

## `components`

| Stĺpec | Typ | Default | Popis |
|--------|-----|---------|-------|
| `id` | bigint | — | PK (timestamp-based) |
| `space_id` | integer | — | FK → spaces (indexed) |
| `name` | text | — | Technický identifikátor |
| `display_name` | text? | null | Zobrazovaný názov |
| `description` | text? | null | Popis |
| `schema` | jsonb | `{}` | Definícia fieldov |
| `image` | text? | null | Preview screenshot URL |
| `preview_field` | text? | null | Field pre block preview |
| `preview_tmpl` | text? | null | HTML šablóna pre block preview |
| `is_root` | boolean | false | Content type |
| `is_nestable` | boolean | true | Vnoriteľný |
| `color` | text? | null | Hex farba ikony |
| `icon` | text? | null | Lucide icon name |
| `component_group_uuid` | text? | null | UUID skupiny |
| `all_presets` | jsonb | `[]` | Presets (UI neimplementované) |
| `internal_tags_list` | jsonb | `[]` | `[{id, name}]` |
| `internal_tag_ids` | text[] | `[]` | Len IDs |
| `content_type_asset_preview` | text? | null | **Preview card field** — field zobrazený v story card |
| `created_at` | timestamp | NOW() | — |
| `updated_at` | timestamp | NOW() | — |

## `component_groups`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | bigint | PK |
| `uuid` | text | Unique |
| `space_id` | integer | FK |
| `name` | text | — |
| `parent_id` | bigint? | Parent group |
| `parent_uuid` | text? | Denormalizované |

## `component_versions`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | serial | PK |
| `component_id` | bigint | FK (CASCADE) |
| `space_id` | integer | FK |
| `user_id` | bigint? | Autor |
| `author_name` | text? | Fallback ak user neexistuje |
| `event` | text | `create` / `update` |
| `schema` | jsonb | Snapshot |
| `name` | text | Snapshot názvu |
| `display_name` | text? | Snapshot display name |
| `is_draft` | boolean | Vždy true |
| `created_at` | timestamp | — |

## `internal_tags`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | bigint | PK |
| `space_id` | integer | FK |
| `name` | text | Názov tagu |
| `object_type` | text | `component` (alebo iné) |

---

# 5. Súhrn implementačného stavu

## ✅ Plne funkčné

**Komponent:**
- Create / Read / Update / Delete / Duplicate
- Groups (CRUD, hierarchia)
- Internal tags (CRUD)
- Block type enforcement (is_root / is_nestable)
- Preview field (block preview v story editore)
- Preview card (`content_type_asset_preview`) — thumbnail v stories liste (API join + JSONB extract + UI render)
- Preview template (HTML šablóna s `{{ it.field }}`)
- Preview screenshot (image upload)
- Icon + color picker
- Version history + restore
- Bulk akcie (duplicate, move, delete, copy JSON)

**Fields — spoločné:**
- display_name, description, required, default_value

**Globálne:**
- **Field conditions** — runtime evaluation v `field-conditions.ts`, filtruje fieldy v EditTab + nested BlockFields (operátory: empty/not_empty/equal/not_equal/greater/less, validation any/all)

**Fields — typ-špecifické:**
- text/textarea: `max_length`, `rtl`, counter, `regex` (inline validation)
- richtext: `max_length` (counter), `custom_class`
- markdown: `rtl`, `max_length` (counter + natívny maxLength)
- number: `min_value`, `max_value`, `steps`, `decimals`
- datetime: `disable_time`
- boolean: `default_value`, `inline_label`
- option: `source` (vrátane `external_datasource` — fetch z URL), `datasource_slug`, `filter_content_type`, `use_uuid`, `exclude_empty_option`, `appearance` (link = radio, card = grid)
- options: `min`, `max` (inline count validation), `external_datasource` fetch
- asset/multiasset: `filetypes` (content_type filter), `asset_folder_id` (initial folder), `allow_external_url`
- link: `allow_target_blank`, `asset_link_type`, `email_link_type`, `show_anchor`, `link_scope` (starts_with), `restrict_content_types` + `component_whitelist`, `allow_custom_attributes` (key/value editor), `enable_advanced_search` (hide/show search), `force_link_scope` (visual scope lock)
- bloks: `restrict_components`, `component_whitelist/denylist`, `component_group_whitelist/denylist`, `component_tag_whitelist/denylist`, `minimum`, `maximum`, `restrict_type` (auto-derivovaný)
- section: `keys` (grouping)

## ⚠️ Čiastočné

- **Custom field type** (`custom`) — wire-up čiastočný
- **Tooltip** flag — inconsistent rendering

## ❌ Len persistencia (ukladá sa, runtime ignoruje)

**Globálne:**
- **Translatable** flag — i18n pipeline neexistuje

**Fields:**
- richtext: `customize_toolbar`, `toolbar` (toolbar customization)
- markdown: `rich_text_as_default`, `allow_empty_paragraphs`, `customize_toolbar`
- multilink: `link_scope/restrict_content_types/show_anchor/allow_custom_attributes/allow_target_blank/asset_link_type/email_link_type` fungujú (zdieľa komponent s `link`)

## Prečo to tak je

Schémy musíme serializovať kompletne, lebo migrujeme zo Storybloku a udržiavame 1:1 JSON kompatibilitu. Implementácia všetkých validácií a renderovacích variantov v story editore je samostatná práca — field editor ukladá všetko čo Storyblok podporuje, ale runtime vyhodnotenie sa dopĺňa postupne. Pri plánovaní migrácie treba počítať s tým, že niektoré behaviors (najmä validácie, asset filtering, bloks group/tag restrictions) sa content editorom budú javiť inak než v Storybloku.
