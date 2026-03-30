# Internal Tags — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/internal-tags

Base path: `/v1/spaces/:space_id/internal_tags`

**Note:** There is no "retrieve single" endpoint — only list, create, update, delete exist.

---

## The Internal Tag Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Tag name |
| `object_type` | string | `asset` or `component` |

```json
{
  "internal_tag": {
    "name": "flower",
    "id": 33772,
    "object_type": "asset"
  }
}
```

---

## GET /v1/spaces/:space_id/internal_tags

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by name |
| `by_object_type` | string | Filter by `asset` or `component` |

**Response:** `{ "internal_tags": [ /* Internal Tag Objects */ ] }`

---

## POST /v1/spaces/:space_id/internal_tags

**Request body:**
```json
{
  "internal_tag": {
    "name": "New Release",
    "object_type": "component"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tag name |
| `object_type` | string | `asset` or `component` |

**Response:** `{ "internal_tag": { /* Internal Tag Object */ } }`

---

## PUT /v1/spaces/:space_id/internal_tags/:internal_tag_id

Same body as POST.

**Response:** `{ "internal_tag": { /* Internal Tag Object */ } }`

---

## DELETE /v1/spaces/:space_id/internal_tags/:internal_tag_id

**Response:** HTTP 200/204, empty body
