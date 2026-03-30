# SBX — Interný Storyblok replacement

Interný CMS pre aplikácie Telekom Slovakia. **Nie je to SaaS** — žiadna fakturácia, žiadna správa organizácií. Cieľ je byť 1:1 API kompatibilný so Storyblok, aby sme mohli migrovať prepnutím env premennej.

## Čo tu robíme

Nahrádzame Storyblok CDN API a Management API vlastnou implementáciou. Migračná stratégia:
1. Exportnúť dáta zo Storyblok → `tools/migrate-export`
2. Importnúť do SBX → `tools/migrate-import`
3. Porovnať odpovede API voči golden dátam → `packages/api-compare`
4. Prepnúť env var v klientoch

## Aplikácie a porty

| App | Port | Popis |
|-----|------|-------|
| `apps/api` | **3000** | NestJS — CDN API (`/v2/cdn/`) + Management API (`/v1/spaces/`) |
| `apps/admin` | **3001** | Next.js + shadcn — admin UI pre správu obsahu |
| `apps/cdn` | **3002** | NestJS — asset delivery + transformácia obrázkov cez Sharp |
| `apps/demo-nextjs` | **3003** | Next.js demo stránka využívajúca `@storyblok/react` |
| `apps/workers` | **3004** | NestJS — BullMQ workery, background joby; Bull Board UI na `/ui` |

### Spustenie

```bash
docker compose up -d                    # PostgreSQL, Redis, MinIO

pnpm --filter api dev                   # :3000
pnpm --filter admin dev                 # :3001
pnpm --filter cdn dev                   # :3002
pnpm --filter demo-nextjs dev           # :3003
pnpm --filter workers dev               # :3004  →  Bull Board: http://localhost:3004/ui
```

### Roly aplikácií

**`apps/api`** — jadro systému. Obsluhuje CDN API (čítanie obsahu pre klientov) aj Management API (správa obsahu cez admin/MAPI). Pripojené na PostgreSQL, Redis, MinIO.

**`apps/admin`** — admin rozhranie. Next.js + shadcn/ui, komunikuje výlučne cez `apps/api`. Volania z admin UI idú na `/api/admin/...` Next.js route handlery, ktoré proxy-ujú na `apps/api`.

**`apps/cdn`** — image service. Stiahne originál z MinIO, transformuje cez Sharp (resize, quality, format), cachuje v Redis (TTL 1 rok). URL formát: `/f/:spaceId/path/to/img.jpg/m/800x600/filters:quality(80)`.

**`apps/demo-nextjs`** — demo klient. Používa `@storyblok/react` namierený na `apps/api` namiesto Storyblok. Slúži na overenie CDN API kompatibility.

**`apps/workers`** — background joby. Spúšťa BullMQ workery pre:
- `webhooks` — async HTTP dispatch s retry (exponential backoff)
- `stories` — plánované publish/expire (`publish_at`, `expire_at`)
- `releases` — spustenie release v naplánovaný čas
- `emails` — SMTP notifikácie (invitation, komentáre, approvals, workflow)
- `workflow-events` — stage transitions, approval lifecycle

## Monorepo štruktúra

```
apps/
  api/          — NestJS backend (port 3000)
  admin/        — Next.js admin UI (port 3001)
  cdn/          — NestJS image/asset service (port 3002)
  demo-nextjs/  — demo klient (port 3003)
  workers/      — BullMQ workery (port 3004)
packages/
  jobs/         — typed JobsClient (@sbx/jobs) — enqueue joby z apps/api do Redis
  api-compare/  — CLI nástroj na porovnanie API odpovedí voči golden dátam
tools/
  migrate-export/   — export zo Storyblok
  migrate-import/   — import do SBX
golden/     — stiahnuté Storyblok API odpovede (pravda, voči ktorej testujeme)
```

## Tech stack

| Vrstva     | Technológia                                 |
|------------|---------------------------------------------|
| Backend    | NestJS (TypeScript)                         |
| Admin UI   | Next.js + shadcn/ui                         |
| Databáza   | PostgreSQL 16 + Drizzle ORM (JSONB pre content) |
| Cache      | Redis 7                                     |
| Storage    | MinIO (S3-compatible, bucket `assets`)      |
| Fronta     | BullMQ (webhooks, scheduled publish)        |
| Obrázky    | Sharp (Storyblok-kompatibilný URL formát)   |

## API autentifikácia

- **CDN API** (`/v2/cdn/...`) — token v query parametri `?token=`, typy `public` / `preview`
- **Management API** (`/v1/spaces/:id/...`) — `Authorization: Bearer <token>`, typ `management`
- **Admin UI API** (`/v1/admin/...`) — session cookie (better-auth) alebo Bearer token
- CDN API vracia **301 redirect** — klienti musia nasledovať presmervania (`curl -L`)
- Každá odpoveď obsahuje pole `cv` (cache version = unix timestamp) pre cache invalidáciu

## Čo je implementované

### CDN API (`/v2/cdn/`)
- `stories` — GET list + GET by slug, rozsiahle filtrovanieq (content_type, tags, uuid, dátumy, strom), `version=draft|published`, `in_release`, `from_release`
- `spaces/me` — metadata space
- `datasources` + `datasource_entries` — s dimenziami a stránkovaním
- `tags` — filtrovanie
- `links` — stromová štruktúra, GET by uuid

### Management API (`/v1/spaces/:spaceId/`)
- `stories` — plný CRUD, publish/unpublish, ancestors, filter-options, `in_release` filter, `release_id` pri update (snapshot)
- `components` + `component_groups` — plný CRUD, duplicate, component-counts
- `assets` + `asset_folders` — plný CRUD, sign upload, restore, replace
- `branches` — plný CRUD
- `releases` — plný CRUD, `conflict_check`, `do_release` publish (aplikuje snapshots)
- `workflows` + `workflow_stages` + `workflow_stage_changes` — plný CRUD, stage transitions
- `approvals` — plný CRUD
- `discussions` + `comments` — plný CRUD, field discussions, resolve/unresolve, rich text
- `webhook_endpoints` + logs — plný CRUD, retry, signing, actions list
- `datasources` + `datasource_entries` — plný CRUD
- `presets` — plný CRUD
- `tags` — plný CRUD
- `tasks` — plný CRUD, execute
- `space_roles` — plný CRUD
- `api_keys` — plný CRUD

### Admin API (`/v1/admin/`)
- `spaces` — list, roles
- `users` — CRUD, search
- `pipelines` — CRUD (per space)
- `assets` — upload, CRUD, folders, counts
- `field_types` — CRUD
- `spaces/:spaceId/preview-token` — generovanie preview tokenov pre Visual Editor

### Visual Editor Bridge
- `GET /bridge/v2-latest.js` — Storyblok-kompatibilný bridge script
- postMessage komunikácia s parent framom
- komponent selection cez `data-blok-uid`
- Preview token (SHA1 signed, TTL-based)

### Admin UI (37 stránok)
- **Content** — stories list (breadcrumb, filter, sort, favorites), story editor, release tabs s Preview/Branch switcherom
- **Assets** — asset library s folder hierarchiou
- **Block Library** — component management
- **Datasources** — datasource + entries editor
- **Tags** — tag management
- **Activities** — audit log
- **Tasks** — task management
- **Settings** — space, users, roles, workflows, access tokens, webhooks + logs, visual editor, asset library, internationalization, maintenance mode, pipelines, history
- **Organization** — spaces, user management, activities, field types, settings
- **User settings** — account, security, tokens, appearance

### Background workers (`apps/workers`)
- `WebhooksProcessor` — HTTP dispatch s retry
- `StorySchedulerProcessor` — `publish_at` / `expire_at` scheduling
- `ReleasesProcessor` — release deployment v naplánovaný čas
- `EmailsProcessor` — SMTP notifikácie
- `WorkflowEventsProcessor` — workflow state transitions
- Bull Board monitoring UI na `:3004/ui`

### DB tabuľky (30)
`spaces`, `users`, `spaceMembers`, `apiTokens`, `stories`, `storyReleases`, `releases`, `assets`, `assetFolders`, `branches`, `pipelines`, `components`, `componentGroups`, `presets`, `fieldTypes`, `datasources`, `datasourceEntries`, `tags`, `workflows`, `workflowStages`, `workflowStageChanges`, `approvals`, `discussions`, `comments`, `webhookEndpoints`, `webhookLogs`, `spaceRoles`, `tasks`, `activities`, `personalAccessTokens`

## Čo ešte chýba / nie je hotové

- **`branches_to_deploy` trigger** — po publish release sa nenotiifikujú CI/CD pipeline hooky
- **Preview URL z branch** — výber branchy v Content view zatiaľ neovplyvňuje preview link pri otvorení story
- **Releases v story editore** — UI na editáciu story priamo v kontexte releasu (s `release_id` v payloade)
- **E2E testy** — test specs existujú ale nie sú kompletné pre všetky nové endpointy

## Spaces (Storyblok production dáta)

| Space          | ID     |
|----------------|--------|
| Live           | 285923 |
| Development    | 285922 |
| Magenta        | 293665 |
| Telekom Apps   | 327730 |

MAPI token: `.env.local` (v root adresári projektu)
Golden dáta: `golden/{space_id}/`

## Asset URL konvencie

- **Nikdy `s3.amazonaws.com` ani `a.storyblok.com`** — všetky asset URL musia vždy ukazovať na náš CDN (`NEXT_PUBLIC_CDN_URL`, default `http://localhost:3002`). Migrované assety z Storybloku môžu mať v DB staré S3/Storyblok URL — vždy ich normalizuj pomocou `normalizeAssetFilename()` z `@/lib/utils` pred uložením do story obsahu.
- **Formát asset URL**: `${CDN_URL}/f/{spaceId}/{path}` — bez akýchkoľvek externých domén.

## MAPI — pravidlá implementácie

**MAPI musí byť 1:1 zhodné s produkčným Storyblok API** (https://www.storyblok.com/docs/api/management).

- Dokumentácia jednotlivých MAPI zdrojov je v `docs/mapi/` — vždy sa nimi riaď
- **Admin UI (`apps/admin`) používa výlučne MAPI** — žiadne custom admin-only endpointy v NestJS (`/v1/admin/...`)
- Admin Next.js route handlery (`apps/admin/src/app/api/admin/...`) sú len thin proxy na MAPI — žiadna transformácia, žiadna business logika
- Ak MAPI niečo nevracia (napr. `total` pre pagination), admin UI sa prispôsobí tomu čo MAPI vracia
- Parametre a response formát MAPI musia zodpovedať Storyblok — vrátane názvov polí, formátov hodnôt (napr. `sort_by=name:asc` nie `sort_field=name&sort_dir=asc`)
- Storyblok admin (`app.storyblok.com`) používa niektoré nedokumentované params (`page`, `per_page`, `sort_by`) — tieto tiež implementujeme

## UI konvencie (apps/admin)

- **Skeleton loading vždy** — pri načítaní dát používame skeleton placeholders (`animate-pulse` bloky v tvare obsahu), nie text "Loading...", nadpis "Loading" ani spinner/preloader.
- **RightSidebar pre detail/edit/create panely** — nikdy centered overlay modal. Výnimka: ConfirmModal pre deštruktívne akcie.
- **ConfirmModal pre delete** — každé mazanie musí ísť cez `ConfirmModal`, nie `window.confirm()`.

## DB migrácie

```bash
cd apps/api
pnpm drizzle-kit generate   # generovanie migrácie
pnpm drizzle-kit migrate    # spustenie migrácie
```
