# Ideation Room (Ideas) — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/ideation-room

A collaborative environment for content ideas with built-in AI assistance.

Base path: `/v1/spaces/:space_id/ideas`

---

## The Idea Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Title |
| `description` | string | Explanatory text |
| `content` | object | Structured idea data |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `deleted_at` | string | Deletion timestamp |
| `status` | string | Approval state |
| `story_ids` | number[] | Associated story IDs |
| `is_private` | boolean | Public or private |
| `bookmarks` | object | External resource references (URLs + labels) |
| `internal_tags_list` | object[] | `[{ id, name }]` |
| `internal_tag_ids` | string[] | Tag IDs |
| `author` | object | `{ id, avatar, userid, friendly_name }` |
| `assignee` | object | `{ id, avatar, userid, friendly_name }` |
| `stories` | object[] | `[{ name, id, full_slug }]` |

---

## GET /v1/spaces/:space_id/ideas

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `sort_by` | string | `created_at:asc`, `created_at:desc`, `updated_at:asc`, `updated_at:desc`, `short_filename:asc`, `short_filename:desc` |
| `per_page` | number | Default 25, max 100 |
| `filter_by_name` | string | Filter by name |
| `by_status` | string | Filter by approval status |
| `with_tag` | string | Comma-separated tag values (OR logic) |
| `in_trash` | boolean | Items in trash |
| `favourite` | boolean | User's favourites |
| `by_assignee_id` | number | Filter by assignee ID |
| `by_ids` | string | Comma-separated idea IDs |

**Response:** Array of idea objects (each includes `discussions` and `comments` arrays)

---

## GET /v1/spaces/:space_id/ideas/:idea_id

**Response:** `{ "idea": { /* Idea Object */ } }`

---

## POST /v1/spaces/:space_id/ideas

**Request body** (wrapped in `idea`):

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Title |
| `description` | No | Descriptive text |
| `content` | No | Idea content data |
| `status` | No | Approval status |
| `story_ids` | No | Associated story IDs |
| `is_private` | No | Public/private flag |
| `bookmarks` | No | External resource URLs + labels |
| `internal_tag_ids` | No | Tag identifiers |
| `assignee` | No | `{ id, avatar, userid, friendly_name }` |

**Response:** `{ "idea": { /* created Idea Object */ } }`

---

## PUT /v1/spaces/:space_id/ideas/:idea_id

Same body as POST plus optional `deleted_at` for soft delete.

**Response:** `{ "idea": { /* updated Idea Object */ } }`

---

## DELETE /v1/spaces/:space_id/ideas/:idea_id

**Response:** HTTP 204 No Content

---

## PUT /v1/spaces/:space_id/ideas/:idea_id/restore

Restore a deleted idea. Also restores its discussion comments.

**Response:** Not explicitly documented.

---

## GET /v1/spaces/:space_id/ideas/:idea_id/discussions

**Response:** `{ "discussions": [ /* discussion objects */ ] }`
