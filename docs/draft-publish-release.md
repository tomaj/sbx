# Draft, Publish a Release — model a implementácia

## 1. Dva obsahové stavy story

Každá story má vždy **dve verzie dát**:

| Pole v DB | Popis |
|-----------|-------|
| `stories.content`, `stories.name`, `stories.slug`, ... | **Draft** — aktuálny editovaný stav |
| `stories.published_data` (json blob) | **Published snapshot** — stav pri poslednom publishnutí |

`published_data` obsahuje: `{ name, slug, full_slug, content, tag_list, path, is_startpage }`

---

## 2. Čo je súčasťou "verzie" story

Nie len `content`, ale všetky editovateľné polia:

| Pole | Verziovaný |
|------|-----------|
| `content` | áno |
| `name` | áno |
| `slug` / `full_slug` | áno |
| `tag_list` | áno |
| `path` | áno |
| `is_startpage` | áno |
| `id`, `uuid`, `space_id`, `parent_id`, `is_folder` | **nie** — identita story |

---

## 3. Story lifecycle

### Save (editácia)
```
stories.content, .name, .slug, ... = nové hodnoty (draft)
stories.unpublished_changes = true
stories.published_data               -- SA NEMENÍ
```

### Publish (`POST /v1/spaces/:spaceId/stories/:id/publish`)
```
stories.published_data = {
  name, slug, full_slug, content, tag_list, path, is_startpage
}  -- snapshot aktuálneho draftu
stories.published = true
stories.unpublished_changes = false
stories.published_at = NOW()
stories.first_published_at = NOW()  (len pri prvom publishnutí)
```

### Unpublish
```
stories.published = false
stories.unpublished_changes = true
-- published_data ostáva (zachováva sa posledný publish)
```

---

## 4. CDN API

### `?version=published`
```sql
SELECT
  published_data->>'name' AS name,
  published_data->>'slug' AS slug,
  published_data->>'full_slug' AS full_slug,
  published_data->'content' AS content,
  published_data->'tag_list' AS tag_list,
  ...
FROM stories
WHERE space_id = :spaceId
  AND published = true
  AND deleted_at IS NULL
```
Fallback: ak `published_data IS NULL`, použijú sa priame polia (backward kompatibilita).

### `?version=draft`
```sql
SELECT name, slug, full_slug, content, tag_list, ...
FROM stories
WHERE space_id = :spaceId AND deleted_at IS NULL
-- žiadny filter na published
```

### `?version=draft&from_release=<releaseId>`
```sql
SELECT
  COALESCE(sr.content->>'name', s.name) AS name,
  COALESCE(sr.content->>'full_slug', s.full_slug) AS full_slug,
  COALESCE(sr.content->'content', s.content) AS content,
  ...
FROM stories s
LEFT JOIN story_releases sr
  ON sr.story_id = s.id AND sr.release_id = :releaseId
WHERE s.space_id = :spaceId AND s.deleted_at IS NULL
```
Implementované ako: načítaj stories, potom načítaj snapshots pre tie story IDs, COALESCE v kóde.

---

## 5. Release lifecycle

### Tabuľky

```
releases
  id, space_id, name, uuid
  released = false       -- true po publishnutí
  release_at             -- scheduled

story_releases            -- snapshot per story per release
  story_id FK → stories
  release_id FK → releases
  content json           -- full snapshot: {name, slug, full_slug, content, tag_list, path, is_startpage}
  UNIQUE(story_id, release_id)

stories.release_ids []   -- denormalizácia pre conflict check
```

### Pridanie/editácia story v release

`PUT /v1/spaces/:spaceId/stories/:id` s `{ story: { ..., release_id: 42 } }`:

1. Načítaj aktuálnu story z DB (base)
2. Načítaj existujúci snapshot v `story_releases` (ak existuje)
3. Zlúč: base → existing_snapshot → new_changes
4. Rekomputuj `full_slug` ak sa zmenil `slug` alebo `is_startpage`
5. Upsert do `story_releases`
6. Pridaj `releaseId` do `stories.release_ids` (ak ešte nie je)
7. **`stories.content` / `.name` / `.slug` SA NEMENIA**

### Výpis stories v release (MAPI)

`GET /v1/spaces/:spaceId/stories?in_release=42` — vracia stories s release snapshotom ako content.

### Preview release (CDN)

`GET /v2/cdn/stories/:slug?version=draft&from_release=42&token=<preview_token>`

→ Vracia release verziu story ak existuje snapshot, inak aktuálny draft.

### Conflict check

`GET /v1/spaces/:spaceId/releases/:id/conflict_check`

Story je v konflikte ak je zároveň v iných aktívnych releases (`stories.release_ids` má viac ako 1 ID).

### Publish release (`PUT /releases/:id` s `{ release: { do_release: true } }`)

Pre každý `story_releases` snapshot:
1. Aplikuj všetky polia snapshotu na hlavnú story (`name`, `slug`, `full_slug`, `content`, atď.)
2. Nastav `published_data = snapshot` (publikovaný stav)
3. `published = true`, `unpublished_changes = false`, `published_at = NOW()`
4. Odstráň `releaseId` z `stories.release_ids`

Potom:
- `DELETE FROM story_releases WHERE release_id = :releaseId`
- `UPDATE releases SET released = true`

---

## 6. Admin UI — Release kontext

Keď je v URL `?release_id=42`:
- Story editor zobrazí banner "Editing in release: [názov release]"
- **Save** ukladá do `story_releases` snapshotu (nie do hlavnej story)
- **Config save** (name, slug, tags) tiež ide do snapshotu
- **Publish** stále publishuje hlavnú story priamo (obchádza release)
- Preview URL obsahuje `from_release=42` pre CDN request

---

## 7. Prečo sa mení numerické ID po publishnutí release (Storyblok)

Storyblok pravdepodobne implementuje release cez kopírovanie story riadkov (nové ID, rovnaké UUID). SBX toto **nereplikuje** — ID ostáva stabilné, aplikujú sa len polia. UUID je stabilný identifikátor.
