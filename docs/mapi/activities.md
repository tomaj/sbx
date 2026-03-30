# Activities — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/activities

Activities are audit log entries created on create, update, and delete actions for resources like stories, components, datasources, etc.

---

## The Activity Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID of the activity |
| `trackable_id` | number | ID of the modified object |
| `trackable_type` | string | Type of object: `Story`, `Component`, `Comment`, `Asset`, etc. |
| `owner_id` | number | ID of the user who performed the action |
| `owner_type` | string | Always `"User"` |
| `key` | string | Action in format `type.action` — e.g. `story.create`, `story.update`, `component.create` |
| `parameters` | object | Additional context; `null` by default |
| `recipient_id` | number | `null` by default |
| `recipient_type` | string | `null` by default |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `space_id` | number | Numeric ID of the space |

---

## The Trackable Object

Varies by entity type. Base shape: `{ "id": "string", "name": "unknown item", "slug": "string" }`

Entity-specific extra fields:

| Entity | Extra Fields |
|--------|-------------|
| `Story` | `is_folder: boolean` |
| `Comment` | `story_id: number`, `story_name: string` |
| `Component` | `component_name: string` |
| `Asset` | `asset_name: string` (filename) |
| `AiLog` | `type`, `action`, `usage` object with token counts |

---

## GET /v1/spaces/:space_id/activities

**Query params:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `created_at_gte` | string | Filter: after `YYYY-MM-DD` |
| `created_at_lte` | string | Filter: before `YYYY-MM-DD` |
| `by_owner_ids` | string | Comma-separated user IDs |
| `types` | string | Comma-separated trackable types (see below) |
| `page` | number | Page number |
| `per_page` | number | Per page (default 25) |

**Supported `types` values:**
`Component`, `Story`, `Workflow`, `WorkflowStage`, `WorkflowStageChange`, `Space`, `Discussion`, `Collaborator`, `Comment`, `SpaceRole`, `Release`, `Branch`, `Asset`, `AssetFolder`, `Approval`, `Tag`, `Datasource`, `DatasourceEntry`, `ScheduledContent`, `Preset`

**Response:** `{ "activities": [ /* Activity Objects */ ] }` (paginated)

---

## GET /v1/spaces/:space_id/activities/:activity_id

**Response:**
```json
{
  "activity": { /* Activity Object */ },
  "trackable": { /* Trackable Object (varies by type) */ },
  "user": {
    "id": 123123,
    "userid": "chakit",
    "friendly_name": "Chakit Arora",
    "active": true
  }
}
```

Note: Single-activity response has three top-level keys (`activity`, `trackable`, `user`), unlike the list which returns only `activities`.
