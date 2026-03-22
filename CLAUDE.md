# SBX — Interný Storyblok replacement

Interný CMS pre aplikácie Telekom Slovakia. **Nie je to SaaS** — žiadna fakturácia, žiadna správa organizácií. Cieľ je byť 1:1 API kompatibilný so Storyblok, aby sme mohli migrovať prepnutím env premennej.

## Čo tu robíme

Nahrádzame Storyblok CDN API a Management API vlastnou implementáciou. Migračná stratégia:
1. Exportnúť dáta zo Storyblok → `tools/migrate-export`
2. Importnúť do SBX → `tools/migrate-import`
3. Porovnať odpovede API voči golden dátam → `packages/api-compare`
4. Prepnúť env var v klientoch

## Monorepo štruktúra

```
apps/
  api/      — NestJS backend (port 3000), hlavné CDN + Management API
  admin/    — Next.js + shadcn admin UI
  img/      — NestJS image service (port 3001), Storyblok-kompatibilná transformácia obrázkov
packages/
  types/    — zdieľané TypeScript typy
  api-compare/ — CLI nástroj na porovnanie API odpovedí voči golden dátam
tools/
  migrate-export/   — export zo Storyblok
  migrate-import/   — import do SBX
golden/     — stažené Storyblok API odpovede (pravda, voči ktorej testujeme)
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

## Lokálny vývoj

```bash
# Spustiť infraštruktúru
docker compose up -d

# API (apps/api)
pnpm --filter api dev          # port 3000

# Image service (apps/img)
pnpm --filter img dev          # port 3001

# Admin (apps/admin)
pnpm --filter admin dev        # port 3002
```

## API autentifikácia

- **CDN API** (`/v2/cdn/...`) — token v query parametri `?token=`, typy `public` / `preview`
- **Management API** (`/v1/spaces/:id/...`) — `Authorization: Bearer <token>`, typ `management`
- CDN API vracia **301 redirect** — klienti musia nasledovať presmervania (`curl -L`)
- Každá odpoveď obsahuje pole `cv` (cache version = unix timestamp) pre cache invalidáciu

## Implementované moduly (apps/api)

- `auth` — JWT autentifikácia, login
- `spaces` — správa spaces
- `users` + `space_members` — používatelia a oprávnenia
- `api_tokens` — CDN + MAPI tokeny
- `datasources` + `datasource_entries` — datasources
- `tags` — CDN tags endpoint
- `components` — Storyblok komponenty (schema)

## Image service URL formát (apps/img)

```
GET /f/:spaceId/path/to/image.jpg/m/WIDTHxHEIGHT/filters:quality(80)
```

Originál uložený v MinIO: `assets/{spaceId}/path/to/image.jpg`
Cache v Redis (TTL 1 rok).

## Spaces (Storyblok production dáta)

| Space          | ID     |
|----------------|--------|
| Live           | 285923 |
| Development    | 285922 |
| Magenta        | 293665 |
| Telekom Apps   | 327730 |

MAPI token: `.env.local` (v root adresári projektu)
Golden dáta: `golden/{space_id}/`

## MVP scope

- [x] CDN API (1:1 kompatibilita) ← najvyššia priorita
- [ ] Management API (core CRUD)
- [ ] Visual Editor bridge
- [ ] Releases (content staging)
- [ ] Webhooks s retry (BullMQ)
- [ ] Admin UI

**Mimo MVP:** Workflow stages

## UI konvencie (apps/admin)

- **Skeleton loading vždy** — pri načítaní dát používame skeleton placeholders (`animate-pulse` bloky v tvare obsahu), nie text "Loading...", nadpis "Loading" ani spinner/preloader.

## DB migrácie

```bash
cd apps/api
pnpm drizzle-kit generate   # generovanie migrácie
pnpm drizzle-kit migrate    # spustenie migrácie
```
