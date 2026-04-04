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

| Vrstva     | Technológia                                 | Verzia    |
|------------|---------------------------------------------|-----------|
| Backend    | NestJS (TypeScript)                         | v11       |
| Admin UI   | Next.js + shadcn/ui                         | v16       |
| Frontend   | React                                       | v19       |
| Jazyk      | TypeScript                                  | v6        |
| Databáza   | PostgreSQL 16 + Drizzle ORM (JSONB pre content) | ORM 0.45 |
| Cache      | Redis 7                                     |           |
| Storage    | MinIO (S3-compatible, bucket `assets`)      |           |
| Fronta     | BullMQ (webhooks, scheduled publish)        | v5        |
| Obrázky    | Sharp (Storyblok-kompatibilný URL formát)   | v0.34     |
| CSS        | Tailwind CSS                                | v4        |
| Linter     | Biome                                       | v2        |

## API autentifikácia

- **CDN API** (`/v2/cdn/...`) — token v query parametri `?token=`, typy `public` / `preview`
- **Management API** (`/v1/spaces/:id/...`) — `Authorization: Bearer <token>`, typ `management`
- **Admin UI API** (`/v1/admin/...`) — session cookie alebo Bearer token
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
`spaces`, `users`, `spaceMembers`, `apiTokens`, `stories`, `storyReleases`, `releases`, `assets`, `assetFolders`, `branches`, `pipelines` (unused — bola nahradená branches), `components`, `componentGroups`, `presets`, `fieldTypes`, `datasources`, `datasourceEntries`, `tags`, `workflows`, `workflowStages`, `workflowStageChanges`, `approvals`, `discussions`, `comments`, `webhookEndpoints`, `webhookLogs`, `spaceRoles`, `tasks`, `activities`, `personalAccessTokens`

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
- Admin Next.js route handlery (`apps/admin/src/app/api/admin/...`) sú len thin proxy na MAPI — žiadna transformácia, žiadna business logika
- **Admin UI používa výlučne MAPI** (`/v1/spaces/:id/...`) — žiadne custom admin-only endpointy pre bežné CRUD operácie
- Custom `/v1/admin/...` endpointy existujú **len pre tieto operácie bez MAPI ekvivalentu**:
  - `GET/POST/PATCH/DELETE /v1/admin/users` — správa všetkých používateľov organizácie (org-level, nie per-space collaborators)
  - `GET /v1/admin/spaces/:id/users/search` — vyhľadávanie používateľov pre space (výber collaboratorov)
  - `GET/POST/PUT/DELETE /v1/admin/spaces/:id/assets` — upload assetov (multipart + file validation)
  - `GET/POST/PUT/DELETE /v1/admin/field-types` — správa field types (org-level, nie v MAPI)
  - `GET /v1/admin/spaces/:id/preview-token` — generovanie signed preview tokenov pre Visual Editor
  - `GET/POST/PATCH /v1/admin/user/avatar` — upload avatara (multipart)
- Ak MAPI niečo nevracia (napr. `total` pre pagination), admin UI sa prispôsobí tomu čo MAPI vracia
- Parametre a response formát MAPI musia zodpovedať Storyblok — vrátane názvov polí, formátov hodnôt (napr. `sort_by=name:asc` nie `sort_field=name&sort_dir=asc`)
- Storyblok admin (`app.storyblok.com`) používa niektoré nedokumentované params (`page`, `per_page`, `sort_by`) — tieto tiež implementujeme

## UI konvencie (apps/admin)

- **Skeleton loading vždy** — pri načítaní dát používame skeleton placeholders (`animate-pulse` bloky v tvare obsahu), nie text "Loading...", nadpis "Loading" ani spinner/preloader.
- **RightSidebar pre detail/edit/create panely** — nikdy centered overlay modal. Výnimka: ConfirmModal pre deštruktívne akcie.
- **ConfirmModal pre delete** — každé mazanie musí ísť cez `ConfirmModal`, nie `window.confirm()`.

## Správa závislostí (pnpm catalog)

- **Zdieľané závislosti** sú verzované v `pnpm-workspace.yaml` pod kľúčom `catalog:`
- V `package.json` používaj `"package": "catalog:"` namiesto explicitnej verzie pre všetky katalógové balíčky
- **Nikdy neupravuj verziu zdieľanej závislosti priamo v `package.json`** — vždy v `catalog:` sekcii workspace.yaml
- App-špecifické závislosti (napr. `sharp`, `nodemailer`, `next`) môžu mať explicitnú verziu

## Build toolchain (NestJS apps)

- **SWC builder** — všetky NestJS apps (api, cdn, workers) kompilujú cez `@swc/core` namiesto Webpack/ts-loader
- Konfig v `nest-cli.json`: `"builder": "swc"`, `"typeCheck": true` (parallelný typecheck cez tsc)
- **`tsx`** — pre ad-hoc skripty (seed, migrácie, dev utilities). Nikdy `ts-node`.
- **Produkcia**: `nest build` → `node dist/main` (SWC skompilovaný JS)

## DB migrácie

Schéma aj migrácie sú v `packages/db` — tam je aj `drizzle.config.ts`.

```bash
cd packages/db
pnpm db:generate   # generovanie migrácie (drizzle-kit generate)
pnpm db:migrate    # spustenie migrácie (drizzle-kit migrate)
pnpm db:studio     # Drizzle Studio UI
```

Pre pohodlie sú skripty dostupné aj z `apps/api` (presmerujú do `packages/db`):

```bash
cd apps/api
pnpm drizzle-kit generate   # ekvivalent vyššie
pnpm drizzle-kit migrate    # ekvivalent vyššie
```

## Env premenné a validácia

- **`apps/api`** — validácia pri štarte cez **Zod schema** v `apps/api/src/config/env.schema.ts`. Ak chýba povinná premenná, app crashne s jasným error message.
- **`apps/admin`** — validácia cez **`@t3-oss/env-nextjs`** v `apps/admin/src/env.ts`. Import `env` z `@/env` — nikdy `process.env` priamo v kóde adminu.
- `JWT_SECRET` musí mať min. 32 znakov — žiadny hardcoded fallback
- `ConfigModule` sa loaduje ako prvý modul v NestJS `AppModule`
- Pri pridávaní novej env premennej: aktualizuj schému v príslušnom súbore (`env.schema.ts` / `env.ts`)

## Security konvencie (apps/api)

- **Helmet** — vždy zapnutý v `main.ts`, generuje security headers (X-Frame-Options, CSP, HSTS...)
- **CORS** — restrict na `localhost:3001`, `localhost:3003` + `CORS_ORIGINS` env var. Nikdy `origin: '*'`
- **ValidationPipe** — globálny, `whitelist: true` (stripuje neznáme properties), `transform: true`
- **Rate limiting** — `@nestjs/throttler` globálne (20 req/s, 200 req/min). Dekorátor `@RateLimit(preset)` s presetmi:
  - `auth` — 5 req/min, 10 req/10min (login, token exchange)
  - `mapi` — 30 req/s, 500 req/min (management API writes)
  - `cdn` — 100 req/s, 3000 req/min (CDN reads)
  - `cdn-image` — 10 req/s, 60 req/10s (Sharp image transforms)
  - `none` — bez limitu (health checks, metrics)
- **sql.raw()** — nikdy bez validácie inputu. Každý field name musí prejsť `/^\w+$/` testom. Preferuj Drizzle query builder
- **BigInt** — serializuje sa ako Number ak `Number.isSafeInteger()`, inak ako String

## Logging (všetky NestJS apps)

- **Všetky tri NestJS apps** (api, cdn, workers) používajú **Pino** cez `nestjs-pino` — štruktúrovaný JSON logging
- V dev prostredí `pino-pretty` s farbami, v produkcii raw JSON
- Každý request má **request ID** (`x-request-id` header alebo auto-generated UUID)
- Health check endpointy (`/health`) sa nelogujú (šum) — konfig v `api/logging.module.ts`
- Konfigurácia v každej app: `src/logging/logging.module.ts` — importovaný ako prvý v `AppModule`
- V `main.ts`: `app.useLogger(app.get(Logger))` s `{ bufferLogs: true }` pri `NestFactory.create()`
- Namiesto `console.log` používaj `Logger` z `nestjs-pino`

## Error handling (apps/api)

- Globálny **AllExceptionsFilter** v `apps/api/src/filters/all-exceptions.filter.ts`
- Každá error response obsahuje `correlationId` (z `x-request-id` headeru)
- 500+ errory sa logujú so stack trace
- Formát error response: `{ statusCode, message, correlationId }`

## Health checks

- `GET /health` — kontroluje DB + Redis konektivitu (via `@nestjs/terminus`)
- `GET /health/liveness` — jednoduchý `{ status: 'ok' }` pre k8s liveness probe
- Implementácia v `apps/api/src/health/`

## Admin route handlery (apps/admin)

- Väčšina route handlerov je nahradená **catch-all proxy** v `apps/admin/src/app/api/admin/[...path]/route.ts`
- Catch-all mapovanie:
  - `/api/admin/users/...` → `/v1/admin/users/...` (org-level user management, bez MAPI ekvivalentu)
  - Všetko ostatné: `/api/admin/X` → `/v1/X` (vrátane `spaces/`, `spaces/123/...`)
- Špecifické route súbory (Next.js ich matchne **pred** catch-all):
  - `auth/` — login/logout (session management)
  - `activities/` — URL remap: `?spaceId=X` query param → `/v1/spaces/X/activities` path param
  - `field-types/` — wrapping body pre field-type API
  - `spaces/` — body wrapping pre space create
  - `tokens/` — personal access token management
  - `user/` — avatar upload (multipart)
- Pri pridávaní nového proxy endpointu: ak je to jednoduchý pass-through, catch-all ho obslúži automaticky. Ak treba body wrapping, URL remapping alebo multipart upload, vytvor špecifický route file

## Data fetching v admin (SWR)

- Používame **SWR** (`useSWR`) pre client-side data fetching — hook `useApi<T>()` z `@/lib/swr`
- `SWRProvider` je v root layoute — globálny config s `revalidateOnFocus: false`
- Po mutáciách (create, update, delete) volaj `mutate()` na revalidáciu dát
- Pre stránkovanie používaj dynamický SWR key: `useApi<T>(\`/api/admin/...?page=${page}\`)`
- Nepoužívaj manuálne `useState` + `useEffect` + `fetch()` pre data loading — vždy `useApi()`

## Formuláre v admin (react-hook-form + zod)

- Používame **react-hook-form** s **zod** validáciou (`@hookform/resolvers/zod`)
- Zod schémy definuj na **module level** (mimo komponentu)
- Pre jednoduché inputy používaj `register('fieldName')`
- Pre komplexné inputy (SelectDropdown, Toggle, custom) používaj `Controller` z react-hook-form
- `isSubmitting` namiesto custom `saving` useState
- `errors.root` pre server-side errory namiesto custom `error` useState
- Pri editácii existujúceho záznamu volaj `reset(existingData)` v useEffect
- UI state (modaly, dropdowny, selectedIds) ostáva ako `useState` — nepatrí do formu

## Swagger / API docs

- **Swagger UI** na `http://localhost:3000/docs` (len v development mode)
- Každý controller má `@ApiTags('...')` dekorátor — grouping podľa domény a typu (CDN/MAPI/Admin)
- Konfigurácia v `main.ts` cez `DocumentBuilder` + `SwaggerModule`
- Auth schémy: Bearer (MAPI/Admin), API Key query param `token` (CDN)
- `nestjs-zod` v5 — Swagger schémy sa generujú automaticky z `createZodDto()` DTOs, bez potreby `@ApiProperty()` dekorátorov

## DTOs — nestjs-zod vzor

Nové DTOs píš ako Zod schema + `createZodDto()` — nie class-validator dekorátory:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const MySchema = z.object({
  name: z.string().min(1),
  count: z.number().int().positive().optional(),
});

export class MyDto extends createZodDto(MySchema) {}
```

Výhody oproti class-validator:
- Swagger schéma sa generuje **automaticky** — žiadny `@ApiProperty()`
- Jedna Zod schéma slúži ako validácia aj TypeScript typ
- Možnosť exportovať typ: `export type MyType = z.infer<typeof MySchema>`

Vzorová implementácia: `apps/api/src/auth/dto/login.dto.ts`

## Auth guard konvencie (apps/api)

- Používame **unified `@Auth()` dekorátor** namiesto `@UseGuards()` s individuálnymi guardmi
- `@Auth('session')` — admin endpointy (cookie/bearer session)
- `@Auth('token')` — CDN endpointy (query param `?token=`)
- `@Auth('session-or-token')` — MAPI endpointy (akceptuje oboje)
- Implementácia v `apps/api/src/auth/unified-auth.guard.ts`
- Staré guardy (SessionGuard, TokenGuard, etc.) boli odstránené — existuje len `UnifiedAuthGuard` a `JwtGuard`

## Webhook konvencie

- **HMAC-SHA256 signing** — payload podpísaný cez `X-Webhook-Signature: sha256={hex}` + `X-Webhook-Timestamp` header
- Signature sa počíta ako `HMAC-SHA256(secret, "{timestamp}.{body}")`
- **Job idempotencia** — webhook joby majú deterministic `jobId` (`wh-{endpointId}-{action}-{spaceId}-{resourceId}-{timestamp}`)
- `Webhook-Secret` header (plaintext) je deprecated — zachovaný pre backwards compat

## DB transakcie

- Multi-table operácie MUSIA používať `this.db.transaction(async (tx) => { ... })`
- Vzor: DB writes v transakcii, side effects (webhooky, job queue, logging) PO transakcii
- Príklady: `publishRelease()`, `publishStory()`, `unpublishStory()`, `createStory()`
- Single-table operácie transakciu nepotrebujú

## Monitoring a telemetria

- **OpenTelemetry** — opt-in cez `OTEL_ENABLED=true` env var
- Auto-instrumentácia pre HTTP, Express, PostgreSQL
- **Prometheus metrics** na `GET /metrics` (prom-client) + OTel exporter na port 9464 (`METRICS_PORT`)
- Implementácia v `apps/api/src/telemetry/`

## CI/CD

- GitHub Actions pipeline v `.github/workflows/ci.yml`
- Joby: lint + typecheck → test API (s Postgres + Redis services) → test CDN → build all
- Trigger: push/PR na `main`
- Shared packages (`@sbx/types`, `@sbx/jobs`) sa buildujú pred každým jobom
