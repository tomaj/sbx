# Datasource Entries — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/datasource-entries

Base URL: `https://mapi.storyblok.com`
Auth: `Authorization: YOUR_OAUTH_TOKEN`

---

## The Datasource Entry Object

```json
{
  "id": 22237,
  "name": "cancel",
  "value": "Abbrechen",
  "dimension_value": "Cancel",
  "datasource_id": 201005
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Key of the entry (unique within datasource) |
| `value` | string | Default value |
| `dimension_value` | string\|null | Value in a specific dimension; `null` unless `dimension` param used |
| `datasource_id` | number | Parent datasource ID |
| `position` | number | Sort order (0 = append at end, 1 = prepend) |

---

## GET /v1/spaces/:space_id/datasource_entries

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `datasource_id` | number | Filter by datasource ID |
| `datasource_slug` | string | Filter by datasource slug — **disables pagination, returns all** |
| `dimension` | number | Numeric ID of a dimension; populates `dimension_value` in results. Requires `datasource_id` or `datasource_slug` |
| `search` | string | Search entries by name (key) |

**Response:**
```json
{
  "datasource_entries": [ /* Datasource Entry Objects */ ]
}
```

No pagination. Use `datasource_slug` to get all entries without pagination.

---

## GET /v1/spaces/:space_id/datasource_entries/:datasource_entry_id

**Response:**
```json
{
  "datasource_entry": { /* Datasource Entry Object */ }
}
```

---

## POST /v1/spaces/:space_id/datasource_entries

**Request body:**
```json
{
  "datasource_entry": {
    "name": "newsletter_text",
    "value": "Subscribe to our newsletter.",
    "datasource_id": 12345,
    "position": 1
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `datasource_entry.name` | string | Yes | Entry key |
| `datasource_entry.value` | string | Yes | Entry value |
| `datasource_entry.datasource_id` | number | Yes | Parent datasource ID |
| `datasource_entry.position` | number | No | 0 = append at end, 1 = prepend |

**Response:** `{ "datasource_entry": { /* created object */ } }`

---

## PUT /v1/spaces/:space_id/datasource_entries/:datasource_entry_id

Supports updating a dimension-specific value via `dimension_id` at the root level.

**Request body (basic update):**
```json
{
  "datasource_entry": {
    "name": "updated_key",
    "value": "Updated value",
    "position": 1
  }
}
```

**Request body (with dimension value):**
```json
{
  "datasource_entry": {
    "name": "newsletter_text",
    "value": "Default value",
    "dimension_value": "Translated value in this dimension"
  },
  "dimension_id": 70466
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `datasource_entry.name` | string | No | Entry key |
| `datasource_entry.value` | string | No | Default value |
| `datasource_entry.position` | number | No | Sort position |
| `datasource_entry.dimension_value` | string | No | Value for the specified dimension |
| `dimension_id` | number | Conditional | Root-level field; required when updating `dimension_value` |

**Response:** `{ "datasource_entry": { /* updated object */ } }`

---

## DELETE /v1/spaces/:space_id/datasource_entries/:datasource_entry_id

**Response:** HTTP 200, empty body
