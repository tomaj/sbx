# Datasources — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/datasources

Base URL: `https://mapi.storyblok.com`
Auth: `Authorization: YOUR_OAUTH_TOKEN`

---

## The Datasource Object

```json
{
  "datasource": {
    "id": 92,
    "name": "Background colors",
    "slug": "background-colors",
    "created_at": "2023-07-03T06:37:28.078Z",
    "updated_at": "2025-07-03T06:37:28.078Z",
    "dimensions": [
      {
        "id": 58711,
        "name": "Spanish",
        "entry_value": "es",
        "datasource_id": 92,
        "created_at": "2023-07-03T09:19:03.495Z",
        "updated_at": "2025-07-03T09:26:22.375Z"
      }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric identifier |
| `name` | string | Display name |
| `slug` | string | URL-friendly identifier |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `dimensions` | object[] | Dimension objects (for i18n/localization) |

**Dimension object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Dimension ID |
| `name` | string | Display name |
| `entry_value` | string | Dimension slug/key (e.g. locale code `"es"`) |
| `datasource_id` | number | Parent datasource ID |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |

---

## GET /v1/spaces/:space_id/datasources

Retrieve all datasources. Storyblok admin also uses undocumented params: `page`, `per_page`, `sort_by=name:asc`.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by name |
| `by_ids` | string | Comma-separated datasource IDs |
| `page` | number | Page number (undocumented, used by Storyblok admin) |
| `per_page` | number | Per page (undocumented, used by Storyblok admin) |
| `sort_by` | string | Sort field and direction, format `field:dir` e.g. `name:asc` (undocumented) |

**Response:**
```json
{
  "datasources": [ /* Datasource Objects */ ]
}
```

---

## GET /v1/spaces/:space_id/datasources/:datasource_id

**Response:**
```json
{
  "datasource": { /* Datasource Object with dimensions */ }
}
```

---

## POST /v1/spaces/:space_id/datasources

**Request body:**
```json
{
  "datasource": {
    "name": "Labels for Website",
    "slug": "labels",
    "dimensions_attributes": [
      { "name": "Spanish", "entry_value": "es" }
    ]
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `datasource.name` | string | Yes | Display name |
| `datasource.slug` | string | Yes | Slug identifier |
| `datasource.dimensions_attributes` | object[] | No | Dimensions to create |
| `datasource.dimensions_attributes[].name` | string | — | Dimension name |
| `datasource.dimensions_attributes[].entry_value` | string | — | Dimension slug/key |

**Response:** `{ "datasource": { /* created object */ } }`

---

## PUT /v1/spaces/:space_id/datasources/:datasource_id

**Request body:**
```json
{
  "datasource": {
    "name": "Updated Name",
    "slug": "updated-slug",
    "dimensions_attributes": [
      { "name": "Spanish", "entry_value": "es" }
    ]
  }
}
```

**Response:** `{ "datasource": { /* updated object */ } }`

---

## DELETE /v1/spaces/:space_id/datasources/:datasource_id

**Response:** HTTP 200, empty body
