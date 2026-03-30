# Storyblok Management API — Lokálna referencia

Stiahnutá dokumentácia z https://www.storyblok.com/docs/api/management

**Base URL:** `https://mapi.storyblok.com/v1`
**Auth:** `Authorization: YOUR_OAUTH_TOKEN`

---

## Súbory

| Súbor | Obsah |
|-------|-------|
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
| [collaborators.md](./collaborators.md) | Collaborators — list, delete |

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
