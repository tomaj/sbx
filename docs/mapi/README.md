# Storyblok Management API — Lokálna referencia

Stiahnutá dokumentácia z https://www.storyblok.com/docs/api/management

**Base URL:** `https://mapi.storyblok.com/v1`
**Auth:** `Authorization: YOUR_OAUTH_TOKEN`

---

## Súbory

| Súbor | Obsah |
|-------|-------|
| [getting-started.md](./getting-started.md) | Úvod — base URL, auth, pagination, rate limits, HTTP status kódy |
| [datasources.md](./datasources.md) | Datasources — CRUD, dimensions, sort_by |
| [datasource-entries.md](./datasource-entries.md) | Datasource Entries — CRUD, dimension values |
| [stories.md](./stories.md) | Stories — CRUD, publish, filter params |
| [components.md](./components.md) | Components + Component Groups — CRUD |
| [assets.md](./assets.md) | Assets + Asset Folders — upload flow, bulk ops |
| [spaces.md](./spaces.md) | Spaces — GET single space |
| [releases.md](./releases.md) | Releases — CRUD, do_release |
| [presets.md](./presets.md) | Presets — CRUD |
| [tags.md](./tags.md) | Tags — list, create, delete (by name!) |
| [workflows.md](./workflows.md) | Workflows + Stages + Stage Changes |
| [collaborators.md](./collaborators.md) | Collaborators — list, invite, update roles, delete |
| [access-tokens.md](./access-tokens.md) | Access Tokens (api_keys) — CRUD |
| [activities.md](./activities.md) | Activities — audit log, filter by type/owner/date |
| [approvals.md](./approvals.md) | Approvals — CRUD, release approvals |
| [discussions.md](./discussions.md) | Discussions + Comments — CRUD, resolve, mentions |
| [internal-tags.md](./internal-tags.md) | Internal Tags — list, create, update, delete (no single GET!) |
| [space-roles.md](./space-roles.md) | Space Roles — CRUD, full permissions enum list |
| [tasks.md](./tasks.md) | Tasks — CRUD, webhook task type |
| [webhooks.md](./webhooks.md) | Webhook Endpoints — CRUD, all action types |
| [branch-deployments.md](./branch-deployments.md) | Branch Deployments — POST only |
| [pipelines.md](./pipelines.md) | Pipelines (Branches) — CRUD; "Pipelines" = `/branches` resource |
| [scheduling-stories.md](./scheduling-stories.md) | Story Schedulings — CRUD |
| [statistics.md](./statistics.md) | Statistics — org traffic, assets bandwidth, per-space daily stats |
| [ai-translate.md](./ai-translate.md) | AI Translate — translate story + get supported languages |
| [ai-style-groups.md](./ai-style-groups.md) | AI Style Groups — CRUD for space + org level |
| [field-plugins.md](./field-plugins.md) | Field Plugins (field_types) — CRUD, publish |
| [extensions.md](./extensions.md) | Extensions (Apps) — CRUD, app_provisions per space |
| [oauth.md](./oauth.md) | OAuth 2.0 — Authorization Code + PKCE flow |
| [external-accounts.md](./external-accounts.md) | External Accounts — GitHub only |
| [ideation-room.md](./ideation-room.md) | Ideation Room (Ideas) — CRUD, restore, discussions |

---

## Kľúčové pravidlá (z CLAUDE.md)

- MAPI musí byť **1:1 zhodné** s produkčným Storyblok
- Admin UI používa **výlučne MAPI** — žiadne custom admin endpointy
- Admin Next.js routes sú len **thin proxy** na MAPI
- Parametre musia zodpovedať Storyblok formátu (napr. `sort_by=name:asc`)

---

## Nedokumentované params ktoré Storyblok admin používa

| Endpoint | Param | Príklad |
|----------|-------|---------|
| GET datasources | `page`, `per_page`, `sort_by` | `sort_by=name:asc` |
| GET datasource_entries | `page`, `per_page` | `per_page=100` |
| GET stories | `page`, `per_page`, `sort_by` | `sort_by=created_at:desc` |
| GET assets | `page`, `per_page` | — |
| GET collaborators | `page`, `per_page` | — |

---

## Dôležité gotchas

- `GET /components` vždy vracia aj `component_groups` v tej istej odpovedi
- `GET /stories/:id/publish` a `/unpublish` — **GET metóda**, nie POST/PUT
- `publish: false` na story update **NEunpublishuje** — použiť `/unpublish` endpoint
- Tags DELETE — `:id` je **meno tagu**, nie numerické ID
- Internal Tags — **neexistuje** single GET endpoint (404)
- Collaborators — **neexistuje** single GET endpoint
- Branch Deployments — existuje **iba POST** create endpoint
- AI Translate — **neperzistuje** preklad automaticky, treba manuálne uložiť story
- `component_group_uuid` (UUID) vs `component_group_id` (numeric) — pozor na rozdiel
