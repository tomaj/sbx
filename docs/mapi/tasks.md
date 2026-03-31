# Tasks — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/tasks

Base path: `/v1/spaces/:space_id/tasks`

---

## The Task Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name |
| `description` | string | Brief description shown to editors |
| `task_type` | string | Type of task. Currently only `"webhook"` is supported |
| `webhook_url` | string | URL called when task is executed |
| `last_execution` | string | Datetime of last execution (`YYYY-mm-dd HH:MM`) |
| `last_response` | string | Last execution response log |
| `user_dialog` | object | Optional pre-execution dialog config (form with text inputs/dropdowns) |

**Webhook payload sent on execution:**
```json
{
  "task": { "id": 12312, "name": "My Task" },
  "text": "The user user@example.com executed the task...",
  "action": "task_execution",
  "space_id": 123123,
  "dialog_values": {}
}
```

---

## GET /v1/spaces/:space_id/tasks

**Response:** `{ "tasks": [ /* Task Objects */ ] }`

---

## GET /v1/spaces/:space_id/tasks/:task_id

**Response:** `{ "task": { /* Task Object */ } }`

---

## POST /v1/spaces/:space_id/tasks

**Request body:**
```json
{
  "task": {
    "name": "My Task Name",
    "task_type": "webhook",
    "webhook_url": "https://example.com/hook",
    "description": "Optional description"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task.name` | string | Yes | Display name |
| `task.task_type` | string | Yes | `"webhook"` (only supported value) |
| `task.webhook_url` | string | Yes | Target URL for webhook call |
| `task.description` | string | No | Description shown to editors |
| `task.user_dialog` | object | No | Pre-execution dialog configuration |

**Response:** `{ "task": { /* created Task Object */ } }`

---

## PUT /v1/spaces/:space_id/tasks/:task_id

Same body as POST. All fields optional.

**Response:** `{ "task": { /* updated Task Object */ } }`

---

## DELETE /v1/spaces/:space_id/tasks/:task_id

**Response:** HTTP 204 No Content
