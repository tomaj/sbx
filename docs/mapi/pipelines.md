# Pipelines (Branches) — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/pipelines

**Note:** "Pipelines" in the Storyblok UI corresponds to the `/branches` REST resource, not `/pipelines`. Pipelines define a content staging workflow with multiple branch stages.

---

## The Branch Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique identifier |
| `name` | string | Display name |
| `space_id` | number | Parent space ID |
| `source_id` | number\|null | Source branch ID; null for root branches |
| `url` | string | Preview URL for this branch |
| `position` | number | Numeric ordering value |
| `deployed_at` | string | Timestamp of last deployment |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `deleted_at` | string\|null | Deletion timestamp; null if active |

```json
{
  "branch": {
    "id": 30443,
    "name": "Branche Dev",
    "space_id": 234234,
    "deleted_at": null,
    "created_at": "2023-08-28T20:17:38.204Z",
    "updated_at": "2024-05-30T09:14:59.842Z",
    "source_id": 30403,
    "deployed_at": "2024-05-30T08:18:38.439Z",
    "url": "https://quickstart.me.storyblok.com/",
    "position": 2
  }
}
```

---

## GET /v1/spaces/:space_id/branches

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `by_ids` | string | Filter by branch IDs (comma-separated) |
| `search` | string | Filter by name |

**Response:** `{ "branches": [ /* Branch Objects */ ] }`

---

## GET /v1/spaces/:space_id/branches/:branch_id

**Response:** `{ "branch": { /* Branch Object */ } }`

---

## POST /v1/spaces/:space_id/branches

**Request body** (wrapped in `branch`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `position` | number | No | Ordering position |
| `source_id` | number | No | Source branch ID |
| `url` | string | No | Preview/deployment URL |

**Response:** `{ "branch": { /* created Branch Object */ } }`

---

## PUT /v1/spaces/:space_id/branches/:branch_id

Same body as POST. All fields optional.

**Response:** `{ "branch": { /* updated Branch Object */ } }`

---

## DELETE /v1/spaces/:space_id/branches/:branch_id

**Response:** HTTP 204 No Content

---

## Summary

| Operation | Method | Path |
|-----------|--------|------|
| List branches | GET | `/v1/spaces/:space_id/branches` |
| Get branch | GET | `/v1/spaces/:space_id/branches/:branch_id` |
| Create branch | POST | `/v1/spaces/:space_id/branches` |
| Update branch | PUT | `/v1/spaces/:space_id/branches/:branch_id` |
| Delete branch | DELETE | `/v1/spaces/:space_id/branches/:branch_id` |
| Create deployment | POST | `/v1/spaces/:space_id/deployments` |
