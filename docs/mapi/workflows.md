# Workflows, Workflow Stages & Stage Changes — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/workflows

---

## Workflows

### The Workflow Object

```json
{
  "workflow": {
    "id": 15268,
    "name": "author",
    "content_types": ["author"],
    "is_default": false
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Workflow name |
| `content_types` | string[] | Content types associated with this workflow |
| `is_default` | boolean | True if this is the default workflow |

### GET /v1/spaces/:space_id/workflows

**Query params:** `content_type` (string, optional) — filter by content type

**Response:** `{ "workflows": [ /* Workflow Objects */ ] }`

### POST /v1/spaces/:space_id/workflows

```json
{ "workflow": { "name": "page", "content_types": ["page"] } }
```

### PUT /v1/spaces/:space_id/workflows/:workflow_id

```json
{ "workflow": { "name": "updated_name", "content_types": ["page", "teaser"] } }
```

### DELETE /v1/spaces/:space_id/workflows/:workflow_id

**Note:** The default workflow cannot be deleted. HTTP 204 No Content.

---

## Workflow Stages

### The Workflow Stage Object

```json
{
  "workflow_stage": {
    "id": 561397,
    "name": "Review",
    "color": "#11eeeb",
    "position": 1,
    "is_default": true,
    "allow_publish": true,
    "allow_admin_publish": true,
    "allow_all_users": false,
    "allow_admin_change": true,
    "allow_editor_change": false,
    "allow_all_stages": false,
    "user_ids": [123123],
    "space_role_ids": [111111, 222222],
    "workflow_stage_ids": [321321],
    "workflow_id": 61816,
    "after_publish_id": 444431
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Stage name (unique within workflow) |
| `color` | string | Hex color (unique within workflow) |
| `position` | number | Position in workflow sequence |
| `is_default` | boolean | Default stage for workflow |
| `allow_publish` | boolean | Allow all users to publish |
| `allow_admin_publish` | boolean | Allow admins to publish |
| `allow_all_users` | boolean | Allow all users to change stage |
| `allow_admin_change` | boolean | Allow admins to change stage |
| `allow_editor_change` | boolean | Allow editors to change stage |
| `allow_all_stages` | boolean | All stages available as next |
| `user_ids` | number[] | Users authorized for stage transitions |
| `space_role_ids` | number[] | Roles authorized for stage transitions |
| `workflow_stage_ids` | number[] | IDs of next available stages |
| `workflow_id` | number | Parent workflow ID |
| `after_publish_id` | number | Stage ID assigned after publishing |

### GET /v1/spaces/:space_id/workflow_stages

**Query params:** `exclude_id`, `by_ids` (comma-separated), `search`, `in_workflow` (workflow ID)

**Response:** `{ "workflow_stages": [ /* Workflow Stage Objects */ ] }`

### POST /v1/spaces/:space_id/workflow_stages

All fields optional. If `workflow_id` omitted, stage is created in default workflow.

```json
{
  "workflow_stage": {
    "name": "Review",
    "color": "#2d3v22",
    "position": 3,
    "workflow_id": 43112,
    "allow_publish": true,
    "allow_admin_change": true,
    "user_ids": [123123],
    "space_role_ids": [111111],
    "after_publish_id": 561398
  }
}
```

### PUT /v1/spaces/:space_id/workflow_stages/:workflow_stage_id

Same fields as POST, all optional.

### DELETE /v1/spaces/:space_id/workflow_stages/:workflow_stage_id

HTTP 204 No Content.

---

## Workflow Stage Changes

### The Workflow Stage Change Object

```json
{
  "workflow_stage_change": {
    "id": 2476842,
    "workflow_stage_id": 528725,
    "created_at": "2024-05-29T06:45:58.125Z",
    "user_id": 124123,
    "workflow_id": 18297,
    "due_date": "2025-08-20T12:33:00.000Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `workflow_stage_id` | number | Target stage ID |
| `workflow_id` | number | Workflow ID |
| `user_id` | number | User who made the change |
| `created_at` | string | ISO 8601 timestamp |
| `due_date` | string\|null | Optional due date |

### POST /v1/spaces/:space_id/workflow_stage_changes

```json
{
  "workflow_stage_change": {
    "story_id": 123,
    "workflow_stage_id": 123
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `workflow_stage_change.story_id` | Yes | Story to transition |
| `workflow_stage_change.workflow_stage_id` | Yes | Target stage |
| `release_id` | No | Release ID (root level) |
| `notify` | No | Notify assigned user (default `false`) |
| `comment` | No | Comment object with message |
| `assign` | No | `{ space_role_ids, user_ids }` |

**Response:** `{ "workflow_stage_change": { /* created object */ } }`
