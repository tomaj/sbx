# Assets — Evidencia funkcionalít

Kompletný prehľad UI, API volání a implementácie pre správu assetov v SBX admin.

---

## 1. Stránky a ich umiestnenie

| Stránka | Cesta v UI | Súbor |
|---------|-----------|-------|
| Asset Library (hlavná) | `/spaces/{id}/assets` | `apps/admin/src/app/(dashboard)/spaces/[spaceId]/assets/page.client.tsx` |
| Asset Library Settings | `/spaces/{id}/settings/asset-library` | `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/asset-library/page.client.tsx` |

---

## 2. Hlavná stránka Asset Library

### 2.1 Toolbar

| Prvok | Typ | Správanie |
|-------|-----|-----------|
| Vyhľadávanie | Text input | Filtruje podľa `filename`, `short_filename`, `alt`, `title` — OR logika, LIKE `%query%` |
| Zoradenie | Dropdown | Možnosti: Default, Created ↑↓, Updated ↑↓, Name ↑↓ — parametre `sort_field` + `sort_dir` |
| Typ obsahu | Dropdown | Image, Video, Audio, PDF, JSON — prefix match LIKE na `content_type` |
| Dátumový filter | Dve date polia | Created after / Created before — filtre na `created_at` |
| Grid/List view | Toggle ikony | Prepína zobrazenie — ukladá sa len lokálne v state |
| Vytvoriť priečinok | Tlačidlo | Otvorí `CreateFolderModal` |
| Nahrať súbory | Tlačidlo | Otvorí `UploadAssetsModal` |

**Pagination:** 24 položiek na stránku (pevné). Zdroj: `GET /api/admin/spaces/{spaceId}/assets?page=N&per_page=24&...`

### 2.2 Sidebar

| Prvok | Akcia |
|-------|-------|
| **All Assets** + počet | Vynuluje `folderId`, zobrazí všetky; počet z `GET /api/admin/spaces/{spaceId}/assets/counts` |
| **Tags** | TODO — zatiaľ len placeholder |
| **Deleted** + počet | Nastaví filter `deleted=true`; počet z `/counts` endpoint |
| **Folder tree** | Kliknutím nastaví `folderId` — filtruje assety podľa priečinka |
| Search v folder tree | Filtruje zobrazené priečinky lokálne (nie API call) |

### 2.3 Zobrazenie Grid

- Každá karta: thumbnail (`AssetThumb`), meno súboru, prípona
- Klik: otvorí `AssetDetailModal`
- CDN thumbnail URL: `${CDN_URL}/f/${spaceId}/${path}/m/fit-in/200x200/filters:no_upscale()`

### 2.4 Zobrazenie List

- Riadok: thumbnail, meno + prípona, veľkosť (bytes → formát), MIME typ, dátum úpravy
- V deleted view: tlačidlo **Restore** → `POST /api/admin/spaces/{spaceId}/assets/{id}/restore`
- Klik na riadok: otvorí `AssetDetailModal`

---

## 3. Komponenty — Assets

### 3.1 `AssetDetailModal`

**Súbor:** `apps/admin/src/components/assets/asset-detail-modal.tsx`

**Layout:** Split screen — ľavá strana preview, pravá strana form + tabs.

#### Ľavá strana — Preview
- Veľký náhľad obrázka (alebo ikona podľa typu)
- Meta info: prípona, rozmery (z `meta_data.width` / `meta_data.height`), veľkosť súboru, formát
- **Focus point button** (crosshair ikona) — prepína focus mode; klik na obrázok umiestni teal bodku a uloží hodnotu do `focus` pola vo formáte `{pixelX}x{pixelY}:{pixelX+1}x{pixelY+1}`. Bodka sa vypočíta z kliknutej pozície relatívnej k zobrazenej veľkosti obrázka a prepočíta na pixely originálneho obrázka pomocou `meta_data.width/height`. Červený × badge na tlačidle maže focus bod.
- **"Open image editor"** — tlačidlo existuje, **nie je implementované** (TODO)

#### Ikony akcií (top right)
| Ikona | Akcia | API volanie |
|-------|-------|-------------|
| Copy URL | Skopíruje verejnú URL assetu do schránky | — |
| Open in tab | Otvorí asset v novom tabe | — |
| Move to folder | **TODO — nie je implementované** | — |
| Replace | Otvorí file input, nahrá nový súbor | `POST /api/admin/spaces/{spaceId}/assets/{id}/replace` multipart `file` |
| Delete | Otvorí `ConfirmModal`, po potvrdení soft-delete | `DELETE /api/admin/spaces/{spaceId}/assets/{id}` |
| Close | Zavrie modal | — |

#### Tab: Overview — polia formulára
| Pole | Typ | DB stĺpec / umiestnenie |
|------|-----|------------------------|
| **Title/Caption** | Text input (required) | `assets.title` |
| **Alt text** | Text input (required) | `assets.alt` |
| — "Generate Alt Text" button | Tlačidlo | `POST /api/admin/spaces/{spaceId}/assets/{id}/ai/alt-text` → vráti `{ alt_text }`, vloží do pola |
| **Asset ID** | Read-only | `assets.id` |
| **Tags** | `TagsMultiselect` | `assets.internal_tag_ids` (JSONB) + `assets.internal_tags_list` |
| **Private asset** | Toggle | `assets.locked` — keď `true`, Copy URL / Open kopíruje `${API_URL}/v1/spaces/{id}/assets/{id}/content` (vyžaduje auth), zobrazí sa Private URL box |
| **Expiration date** | Date input | `assets.expire_at` (TIMESTAMP) |
| **Copyright** | Text input | `assets.copyright` |
| **Source** | Text input | `assets.meta_data.source` (v JSONB objekte) |
| **Custom metadata fields** | Dynamické inputy | `assets.meta_data.<key>` — polia sú definované v `spaces.asset_library_settings.customMetadataFields` |

Custom metadata polia sa filtrujú podľa `filetypes` — napr. pole s `filetypes: ["images"]` sa ukáže len pri obrázkoch.

#### Tab: References
- Zoznam stories, ktoré tento asset používajú
- Načítava sa cez: `GET /api/admin/spaces/{spaceId}/stories?reference_search[]={filename}&per_page=25`
- Zobrazí: meno story, slug, dátum úpravy, odkaz na editáciu

#### Uloženie formulára
- **Save & Close**: `PATCH /api/admin/spaces/{spaceId}/assets/{id}` s telom:
```json
{
  "title": "...",
  "alt": "...",
  "copyright": "...",
  "expire_at": "2026-12-31T00:00:00Z",
  "locked": false,
  "folder_id": 123,
  "meta_data": { "source": "...", "customField1": "..." },
  "internal_tag_ids": [1, 2, 3]
}
```

**API route:** `PATCH /api/admin/spaces/{spaceId}/assets/{id}` → proxy na `PATCH /v1/admin/spaces/{spaceId}/assets/{id}`

---

### 3.2 `UploadAssetsModal`

**Súbor:** `apps/admin/src/components/assets/upload-assets-modal.tsx`

| Prvok | Popis |
|-------|-------|
| Drag & drop zóna | Prijíma súbory ťahaním alebo kliknutím |
| Zoznam súborov | Status indikátory: Pending (X), Uploading (spinner), Done (✓), Error (červená ikona) |
| File size display | Formátovaná veľkosť každého súboru |
| Limit notifikácia | "max 100 MB each" |

**Limity:**
- Max 50 súborov naraz (server)
- Max 100 MB na súbor (server + client Content-Length check)
- Konfigurovaný limit per space (z `asset_library_settings.uploadLimitMb`, default 5 MB)

**API volanie:** `POST /api/admin/spaces/{spaceId}/assets/upload`
- FormData: `files` (multiple), `folder_id` (optional)
- Server: FilesInterceptor, MIME whitelist, magic bytes verification
- **Blokované typy:** `text/html`, `text/xml`, `image/svg+xml` (XSS ochrana)

---

### 3.3 `CreateFolderModal`

**Súbor:** `apps/admin/src/components/assets/create-folder-modal.tsx`

| Pole | Typ | Popis |
|------|-----|-------|
| New name | Text input (autofocus, required) | Meno nového priečinka |
| Parent folder | Tree selector | Hierarchický výber rodiča — default: root (Home ikona) |

**API volanie:** `POST /api/admin/spaces/{spaceId}/assets/folders`
```json
{ "name": "Folder Name", "parent_id": 12345 }
```
→ proxy na `POST /v1/spaces/{spaceId}/asset_folders` s wrappingom: `{ "asset_folder": { "name", "parent_id" } }`

---

### 3.4 `FolderTree`

**Súbor:** `apps/admin/src/components/assets/folder-tree.tsx`

Používa `TreeNav` komponent s filter inputom a context menu.

#### Context menu akcie
| Akcia | API volanie | Implementácia |
|-------|-------------|---------------|
| Create subfolder | Otvorí `CreateFolderModal` s predvybraným parent | ✅ |
| Rename | Inline edit, `PATCH /api/admin/spaces/{spaceId}/assets/folders/{id}` | ✅ |
| Move | **TODO — nie je implementované** | ❌ |
| Delete | `ConfirmModal` → `DELETE /api/admin/spaces/{spaceId}/assets/folders/{id}` | ✅ |

---

### 3.5 `AssetPickerModal`

**Súbor:** `apps/admin/src/components/assets/asset-picker-modal.tsx`

Používa sa pri výbere assetov z editora story alebo iných miest.

| Režim | Správanie |
|-------|-----------|
| `single` | Klik na asset = okamžitý výber a zatváranie |
| `multi` | Checkbox na každom assete, potvrdenie tlačidlom "Select N" |

**Sidebar:** All Assets, folder tree s počtami
**Hlavný panel:** search, sort, view toggle, grid/list

**API volania:**
- `GET /api/admin/spaces/{spaceId}/assets/folders`
- `GET /api/admin/spaces/{spaceId}/assets/counts`
- `GET /api/admin/spaces/{spaceId}/assets?page=...&per_page=...&search=...&folder_id=...&sort_field=...&sort_dir=...`

---

### 3.6 `AssetThumb`

**Súbor:** `apps/admin/src/components/assets/asset-thumb.tsx`

| Content type | Zobrazenie |
|--------------|-----------|
| `image/*` | Skutočný obrázok cez CDN thumbnail URL |
| `video/*` | Ikona FileVideo |
| `audio/*` | Ikona FileAudio |
| `text/*` | Ikona FileText |
| ostatné | Generická ikona File |

CDN URL formát: `${CDN_URL}/f/${spaceId}/${path}/m/fit-in/${size}x${size}/filters:no_upscale()`
Fallback: priamo `filename` URL ak CDN zlyhá.

---

## 4. Asset Library Settings stránka

**Súbor:** `apps/admin/src/app/(dashboard)/spaces/[spaceId]/settings/asset-library/page.client.tsx`

Konfigurácia sa ukladá do `spaces.asset_library_settings` (JSONB stĺpec v DB).

**API volanie pre načítanie:** `GET /api/admin/spaces/{spaceId}/space`
**API volanie pre uloženie:** `PATCH /api/admin/spaces/{spaceId}` s `{ space: { asset_library_settings: {...} } }`

### 4.1 Sekcia: Default Metadata Fields

Štyri vstavané polia s konfigurovateľnými prepínačmi:

| Pole | Prepínač Required | Prepínač Translatable | DB kľúč |
|------|-------------------|-----------------------|---------|
| Alt Text | ✅ (toggle) | ✅ (toggle) | `defaultMetadataFields.altText` |
| Title/Caption | ✅ (toggle) | ✅ (toggle) | `defaultMetadataFields.titleCaption` |
| Copyright | ✅ (toggle) | ✅ (toggle) | `defaultMetadataFields.copyright` |
| Source | ✅ (toggle) | ✅ (toggle) | `defaultMetadataFields.source` |

**Implementácia:** Prepínače Required/Translatable sú uložené v `spaces.asset_library_settings.defaultMetadataFields`. UI ich zobrazuje, ale **backend validácia povinných polí pri uploade nie je vynútená** — ide zatiaľ o konfiguráciu pre UI.

### 4.2 Sekcia: Custom Metadata Fields

| Prvok | Typ | DB kľúč |
|-------|-----|---------|
| Meno pola | Text input (monospace) | `customMetadataFields[].key` |
| Platí pre filetype | Dropdown: any, images, videos, audios, texts | `customMetadataFields[].filetypes` |
| Required | Toggle | `customMetadataFields[].required` |
| Translatable | Toggle | `customMetadataFields[].translatable` |
| Pridať pole | Tlačidlo "+" | Pridá nový objekt do poľa |
| Zmazať pole | X tlačidlo | Odstráni z poľa |

Custom fields sa zobrazujú v `AssetDetailModal` pod základnými metadátami. Hodnoty sa ukladajú do `assets.meta_data.<key>`.

### 4.3 Sekcia: Upload Size Limits

| Prvok | Typ | DB kľúč |
|-------|-----|---------|
| Per-file limit | Number input (MB) | `spaces.asset_library_settings.uploadLimitMb` |
| Decrement button | Tlačidlo "−" | Znižuje limit o 1 |
| Increment button | Tlačidlo "+" | Zvyšuje limit o 1 |

- Default: 5 MB
- Min: 1 MB
- Max: 5000 MB
- **Implementácia:** Limit je uložený v settings, ale **backend upload endpoint (`/v1/admin/spaces/{spaceId}/assets/upload`) má pevný hardcoded limit 100 MB** a limit zo settings aktívne nevynucuje.

---

## 5. Backend — API Endpointy

### 5.1 Admin endpointy (`/v1/admin/spaces/:spaceId/assets`)

Auth: Session cookie alebo Bearer token.

| Metóda + cesta | Popis | Implementácia |
|----------------|-------|---------------|
| `GET /counts` | Počet aktívnych + zmazaných | ✅ |
| `GET /` | Zoznam assetov s filtrami | ✅ |
| `POST /upload` | Upload súborov (multipart, max 50 files, 100 MB each) | ✅ |
| `GET /:id` | Jeden asset | ✅ |
| `PATCH /:id` | Update metadát | ✅ |
| `DELETE /:id` | Soft delete + webhook `asset.deleted` | ✅ |
| `POST /:id/restore` | Obnoviť zmazaný asset | ✅ |
| `POST /:id/replace` | Nahradiť súbor | ✅ |
| `POST /:id/ai/alt-text` | AI generovanie alt textu | ✅ (vyžaduje AI konfig) |
| `GET /folders` | Zoznam priečinkov | ✅ |
| `POST /folders` | Vytvoriť priečinok | ✅ |
| `PATCH /folders/:id` | Premenovať / presunúť priečinok | ✅ |
| `DELETE /folders/:id` | Zmazať priečinok | ✅ |

### 5.2 MAPI endpointy (`/v1/spaces/:spaceId/assets`)

Auth: Session alebo access token.

| Metóda + cesta | Popis | Implementácia |
|----------------|-------|---------------|
| `GET /assets` | Zoznam (Storyblok kompatibilné filtre) | ✅ |
| `POST /assets` | Podpis pre priamy upload (sign upload) | ✅ |
| `GET /assets/:id` | Jeden asset | ✅ |
| `PUT /assets/:id` | Update (`{ asset: {...} }` wrapper) | ✅ |
| `DELETE /assets/:id` | Soft delete | ✅ |
| `POST /assets/:id/restore` | Obnoviť | ✅ |
| `GET /assets/:id/content` | Stiahnutie súboru (aj private, vyžaduje auth) | ✅ |
| `POST /assets/bulk_update` | Hromadné presunutie do priečinka (`asset_folder_id: null` = root) | ✅ |
| `POST /assets/bulk_destroy` | Hromadné soft delete | ✅ |
| `POST /assets/bulk_restore` | Hromadné obnovenie | ✅ (API, bez UI) |
| `GET /asset_folders` | Zoznam priečinkov | ✅ |
| `GET /asset_folders/:id` | Jeden priečinok | ✅ |
| `POST /asset_folders` | Vytvoriť | ✅ |
| `PUT /asset_folders/:id` | Update | ✅ |
| `DELETE /asset_folders/:id` | Zmazať | ✅ |

---

## 6. Databázová schéma

### 6.1 Tabuľka `assets`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | BIGINT PK | Generovaný ID (timestamp + random) |
| `space_id` | INTEGER FK | Referencuje `spaces.id` |
| `filename` | TEXT | `/f/{spaceId}/{id}-{safeName}` — normalizovaná cesta |
| `short_filename` | TEXT | Originálny názov súboru |
| `content_type` | TEXT | MIME typ |
| `content_length` | BIGINT | Veľkosť v bytoch |
| `alt` | TEXT | Alt text |
| `title` | TEXT | Nadpis/popis |
| `copyright` | TEXT | Copyright text |
| `focus` | TEXT | Fokusný bod pre crop (formát `NNNxNNN:NNNxNNN`) |
| `folder_id` | BIGINT | FK na `asset_folders.id`, NULL = root |
| `locked` | BOOLEAN | Private asset flag (default false) |
| `expire_at` | TIMESTAMP | Dátum expirácie |
| `is_external_url` | BOOLEAN | Externá URL (napr. migrované assety) |
| `meta_data` | JSONB | `{width?, height?, source?, ...customFields}` |
| `internal_tags_list` | JSONB | `[{id: number, name: string}]` |
| `internal_tag_ids` | JSONB | `["123", "456"]` — string IDs |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |
| `created_at` / `updated_at` | TIMESTAMP | Časové pečiatky |

### 6.2 Tabuľka `asset_folders`

| Stĺpec | Typ | Popis |
|--------|-----|-------|
| `id` | BIGINT PK | |
| `space_id` | INTEGER FK | |
| `name` | TEXT | Meno priečinka |
| `parent_id` | BIGINT | FK na seba (hierarcia), NULL = root level |
| `uuid` | TEXT UNIQUE | UUID identifikátor |
| `created_at` / `updated_at` | TIMESTAMP | |

### 6.3 Nastavenia v tabuľke `spaces`

Stĺpec: `asset_library_settings` (JSONB)

```json
{
  "defaultMetadataFields": {
    "altText":       { "required": true,  "translatable": false },
    "titleCaption":  { "required": true,  "translatable": false },
    "copyright":     { "required": false, "translatable": false },
    "source":        { "required": false, "translatable": false }
  },
  "customMetadataFields": [
    {
      "key": "photographer",
      "required": false,
      "filetypes": ["images"],
      "translatable": false
    }
  ],
  "uploadLimitMb": 5
}
```

---

## 7. Webhooky

| Udalosť | Kedy sa spustí |
|---------|----------------|
| `asset.created` | Pri úspešnom uploade |
| `asset.updated` | Pri update metadát |
| `asset.deleted` | Pri soft delete |

---

## 8. Storage (MinIO)

- Bucket: `assets`
- Key formát: `{spaceId}/{id}-{safeName}`
- Pri replace: starý súbor sa prepíše rovnakým kľúčom
- CDN (`apps/cdn`) stiahne z MinIO, transformuje cez Sharp, cachuje v Redis (TTL 1 rok)

---

## 9. Private assets — architektúra

### Problém

CDN (`apps/cdn`, port 3002) nemá prístup do PostgreSQL — slúži len ako rýchla image delivery vrstva (MinIO → Sharp → response). Nemôže pri každej požiadavke lookupovať `assets.locked` v DB.

### Riešenie: Redis flag

API pri každej zmene `locked` stavu zapíše/zmaže kľúč v Redis. CDN si tento kľúč prečíta synchronne pred tým, než začne spracovávať požiadavku.

```
Akcia: locked = true
  API  →  redis.set('cdn:asset:private:{objectKey}', '1')
  CDN  →  redis.exists('cdn:asset:private:{objectKey}') → 1 → 403 Forbidden

Akcia: locked = false
  API  →  redis.del('cdn:asset:private:{objectKey}')
  CDN  →  redis.exists('cdn:asset:private:{objectKey}') → 0 → obslúži normálne
```

### Formát kľúča

```
cdn:asset:private:{objectKey}
```

Kde `objectKey` = MinIO kľúč = `filename` z DB bez prefixu `/f/`.

Príklad: asset s `filename = /f/12345/abc123/photo.jpg` → kľúč `cdn:asset:private:12345/abc123/photo.jpg`.

### Súbory

| Súbor | Zmena |
|-------|-------|
| `apps/api/src/assets/assets.service.ts` | Injectuje `REDIS`, po `updateAsset()` volá `redis.set/del` keď sa `locked` zmení |
| `apps/cdn/src/redis/redis.module.ts` | Nový Global Redis modul pre CDN (používa `ConfigService`) |
| `apps/cdn/src/app.module.ts` | Importuje `RedisModule` |
| `apps/cdn/src/asset/asset.service.ts` | Injectuje `REDIS`, checkuje flag v `handle()` pred spracovaním |

### Prístup k private assetom

Keď je asset `locked=true`, verejná CDN URL (`/f/...`) vracia **403**. Asset je dostupný len cez autentifikovaný endpoint:

```
GET /v1/spaces/{spaceId}/assets/{id}/content
Authorization: Bearer <token>
```

Tento endpoint je v `apps/api/src/assets/assets.controller.ts`, streamuje súbor priamo z MinIO s hlavičkami `Cache-Control: private, no-store`.

---

## 10. Prehľad implementácie — čo funguje, čo nie

| Funkcionalita | Stav | Poznámka |
|---------------|------|---------|
| Upload súborov (batch) | ✅ | Max 50 súborov, 100 MB hard cap, limit zo settings vynútený |
| Edit metadát (title, alt, copyright) | ✅ | |
| Focus point editor | ✅ | Klik na obrázok → teal bodka, uloží sa ako `{x}x{y}:{x+1}x{y+1}` |
| Custom metadata fields | ✅ | Definícia v settings, hodnoty v `meta_data` |
| Folder organizácia (hierarchia) | ✅ | |
| Presun assetov do priečinka cez UI | ✅ | `MoveFolderModal` — jednotlivý asset aj bulk |
| Presun priečinkov | ✅ | Context menu → `MoveFolderModal` |
| Bulk operácie v UI (select multiple) | ✅ | Checkbox na hover; toolbar: Tag, Move, Delete |
| Soft delete + restore | ✅ | |
| Full-text search | ✅ | filename, alt, title, short_filename |
| Filtrovanie (typ, dátum, priečinok, tag) | ✅ | |
| Zoradenie | ✅ | |
| Tagovanie (internal tags) | ✅ | |
| Expiration date | ✅ | Uložené, ale expire logika (auto-delete) **nie je implementovaná** |
| Asset file replace | ✅ | |
| AI alt text generovanie | ✅ | Vyžaduje AI konfig pre space |
| Grid + list view | ✅ | |
| Thumbnail cez CDN | ✅ | |
| Asset picker modal | ✅ | single + multi mode |
| References (ktoré stories asset používajú) | ✅ | |
| Asset Library Settings UI | ✅ | |
| Private assets (locked) | ✅ | `locked=true` → URL ide cez `GET /v1/spaces/{id}/assets/{id}/content` (vyžaduje auth) |
| Upload limit vynútený backendom | ✅ | Čítaný z `spaces.asset_library_settings.uploadLimitMb`; hard cap 100 MB |
| Required/Translatable flags vynútené pri uploade | ❌ | Len uložené, backend to nevynucuje |
| Image editor | ✅ | `react-filerobot-image-editor` — lazy loaded; Crop, Finetune, Filters, Annotate, Watermark, Resize; Save overwrites original alebo Save as new asset |
| CDN-level blokovanie private assetov | ✅ | Redis flag `cdn:asset:private:{objectKey}` — API píše, CDN číta pred každou požiadavkou |
| Asset export | ❌ | Neimplementované |
