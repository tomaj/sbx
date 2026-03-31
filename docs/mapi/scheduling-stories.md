# Scheduling Stories — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/scheduling-stories

Base path: `/v1/spaces/:space_id/story_schedulings`

---

## The Story Scheduling Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `space_id` | number | Space ID |
| `story_id` | number | Story ID |
| `user_id` | number | User who created the schedule |
| `language` | string | Language code (empty string = default language) |
| `publish_at` | string | Publishing date — ISO 8601 |
| `status` | string | `scheduled` or `published_before_schedule` |
| `deleted_at` | string\|null | Deletion timestamp, or null |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |

```json
{
  "id": 2342,
  "space_id": 233027,
  "story_id": 314931981,
  "user_id": 110930,
  "language": "",
  "publish_at": "2024-04-27T10:12:00.000Z",
  "status": "published_before_schedule",
  "deleted_at": null,
  "created_at": "2024-04-26T09:42:34.179Z",
  "updated_at": "2024-04-26T09:45:39.262Z"
}
```

---

## GET /v1/spaces/:space_id/story_schedulings

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `by_status` | string | Filter by `scheduled` or `published_before_schedule` |

**Response:** `{ "story_schedulings": [ /* Story Scheduling Objects */ ] }`

---

## GET /v1/spaces/:space_id/story_schedulings/:story_scheduling_id

**Response:** `{ "story_scheduling": { /* Story Scheduling Object */ } }`

---

## POST /v1/spaces/:space_id/story_schedulings

**Request body** (wrapped in `story_scheduling`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `story_id` | number | Yes | Story to schedule |
| `publish_at` | string | Yes | ISO 8601 timestamp e.g. `"2024-07-26T06:56:00.000Z"` |
| `language` | string | No | Language code (empty = default) |

**Response:** `{ "story_scheduling": { /* Story Scheduling Object */ } }`

---

## PUT /v1/spaces/:space_id/story_schedulings/:story_scheduling_id

**Request body:**
```json
{
  "story_scheduling": {
    "publish_at": "2024-08-26T06:56:00.000Z"
  }
}
```

**Response:** `{ "story_scheduling": { /* updated Story Scheduling Object */ } }`

---

## DELETE /v1/spaces/:space_id/story_schedulings/:story_scheduling_id

**Response:** `{ "story_scheduling": { /* deleted Story Scheduling Object */ } }`
