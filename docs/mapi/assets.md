# Assets & Asset Folders — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/assets

---

## The Asset Object

```json
{
  "id": 1520,
  "filename": "https://s3.amazonaws.com/a.storyblok.com/f/616/SIZE/HASH/hero.jpg",
  "space_id": 123,
  "created_at": "2024-05-07T11:47:28.950Z",
  "updated_at": "2024-05-14T11:13:51.688Z",
  "file": null,
  "asset_folder_id": null,
  "deleted_at": null,
  "short_filename": "hero.jpeg",
  "content_length": 847195,
  "content_type": "image/jpeg",
  "alt": "Alt text",
  "copyright": "",
  "title": "",
  "focus": "1964x892:1965x893",
  "expire_at": null,
  "publish_at": null,
  "source": "",
  "internal_tag_ids": ["33772"],
  "locked": false,
  "is_private": true,
  "meta_data": {
    "alt": "alt text",
    "title": "image title",
    "source": "image source",
    "copyright": "CC",
    "alt__i18n__de": "Alt in german"
  },
  "internal_tags_list": [{ "id": 33772, "name": "flower" }]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `filename` | string | Full URL including path |
| `space_id` | number | Space ID |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `file` | object\|null | File object during upload, `null` when retrieving |
| `asset_folder_id` | number\|null | Folder ID; `null` if root |
| `deleted_at` | string\|null | Deletion timestamp or `null` |
| `short_filename` | string | Filename without path |
| `content_type` | string | MIME type |
| `content_length` | number | File size in bytes |
| `alt` | string | Alt text (default language) |
| `copyright` | string | Copyright (default language) |
| `title` | string | Title (default language) |
| `source` | string | Source (default language) |
| `focus` | string | Focal point e.g. `1964x892:1965x893` |
| `expire_at` | string\|null | ISO 8601 expiration |
| `publish_at` | string\|null | ISO 8601 publication date |
| `internal_tag_ids` | string[] | Internal tag IDs |
| `internal_tags_list` | object[] | `{ id, name }` tag details |
| `locked` | boolean | Prevent modifications (default `false`) |
| `is_private` | boolean | Requires access token (default `false`) |
| `meta_data` | object | Default + i18n metadata; i18n keys use `FIELD__i18n__LANG` format |

---

## GET /v1/spaces/:space_id/assets

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `in_folder` | number | Filter by folder ID; `-1` = deleted assets |
| `sort_by` | string | `created_at:asc/desc`, `updated_at:asc/desc`, `short_filename:asc/desc` |
| `is_private` | boolean | `1` = only private assets |
| `search` | string | Filter by filename |
| `by_alt` | string | Filter by alt text |
| `by_copyright` | string | Filter by copyright |
| `by_title` | string | Filter by title |
| `with_tags` | string | Comma-separated tags (OR logic) |
| `page` | number | Page number |
| `per_page` | number | Per page |

**Response:** `{ "assets": [ /* Asset Objects */ ] }`

---

## GET /v1/spaces/:space_id/assets/:asset_id

**Response:** `{ "asset": { /* Asset Object */ } }`

---

## Upload — 3-step process

### Step 1: POST /v1/spaces/:space_id/assets — get signed response

**Request body:**
```json
{
  "filename": "hero.jpg",
  "asset_folder_id": 638352,
  "validate_upload": 1
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `filename` | Yes | Filename to upload |
| `id` | No | Existing asset ID (for replace) |
| `asset_folder_id` | No | Target folder |
| `size` | No | Dimensions `300X400` |
| `validate_upload` | No | `1` = validate via finish_upload |

**Response:** `{ post_url, fields: { key, policy, x-amz-*, acl, Content-Type, ... } }`

### Step 2: POST `<post_url>` — upload to S3

`multipart/form-data` with all `fields` as form fields + `file` field with binary content.

### Step 3: GET /v1/spaces/:space_id/assets/:asset_id/finish_upload

Only needed when `validate_upload=1`. Returns minimal asset object.

---

## PUT /v1/spaces/:space_id/assets/:asset_id

**Request body:**
```json
{
  "asset": {
    "asset_folder_id": 123,
    "internal_tag_ids": [1111],
    "is_private": true,
    "locked": false,
    "meta_data": { "alt": "Alt text", "copyright": "CC", "alt__i18n__de": "Deutsch" },
    "publish_at": "2025-05-31T11:52:00.000Z"
  }
}
```

---

## DELETE /v1/spaces/:space_id/assets/:asset_id

**Response:** `{ "asset": { /* deleted Asset Object */ } }`

---

## Bulk operations

### POST /v1/spaces/:space_id/assets/bulk_update — move to folder
```json
{ "asset_folder_id": 299783, "ids": [15904978, 15878980] }
```

### POST /v1/spaces/:space_id/assets/bulk_destroy — delete multiple
```json
{ "ids": [20142579, 20142580] }
```

### POST /v1/spaces/:space_id/assets/bulk_restore — restore deleted
```json
{ "ids": [13941914] }
```
Use `in_folder=-1` to list deleted assets first.

---

## The Asset Folder Object

```json
{
  "asset_folder": {
    "id": 123123,
    "name": "Storyblok assets",
    "parent_id": null,
    "uuid": "635b8e1-5fc0-4c43-83a0-08d090dsa8bd50",
    "parent_uuid": null
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name |
| `parent_id` | number\|null | Parent folder ID or `null` for root |
| `uuid` | string | UUID |
| `parent_uuid` | string\|null | Parent folder UUID |

---

## GET /v1/spaces/:space_id/asset_folders

**Query params:** `by_ids`, `by_uuids`, `search`, `with_parent` (filter by parent_id)

**Response:** `{ "asset_folders": [ /* Asset Folder Objects */ ] }`

---

## POST /v1/spaces/:space_id/asset_folders

```json
{ "asset_folder": { "name": "Header Images", "parent_id": 123123 } }
```

**Response:** `{ "asset_folder": { /* created */ } }`

---

## PUT /v1/spaces/:space_id/asset_folders/:asset_folder_id

```json
{ "asset_folder": { "name": "Updated Name", "parent_id": 288983 } }
```

---

## DELETE /v1/spaces/:space_id/asset_folders/:asset_folder_id

HTTP 200, empty body.
