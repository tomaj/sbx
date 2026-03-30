# Discussions & Comments — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/discussions

---

## The Discussion Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `title` | string | Title of the discussion field |
| `block_uid` | string | UID of the block the discussion is attached to |
| `fieldname` | string | Technical name of the field |
| `solved_at` | string\|null | Resolution timestamp; `null` if unsolved |
| `component` | string | Component/block name |
| `lang` | string | Language code |
| `uuid` | string | UUID |
| `last_comment` | object | Most recent comment (see below) |

**`last_comment` fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `message` | string\|null | Plain text message |
| `message_json` | array | Array of `{text, type, attrs?}` objects |
| `user_id` | number | Author user ID |
| `uuid` | string | UUID |

---

## GET /v1/spaces/:space_id/stories/:story_id/discussions

**Query params:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `per_page` | number | Default 25, max 100 |
| `page` | number | Page number |
| `by_status` | string | `unsolved` or `solved` |

**Response:** `{ "discussions": [ /* Discussion Objects */ ] }`

---

## GET /v1/spaces/:space_id/discussions/:discussion_id

**Response:** `{ "discussion": { /* Discussion Object */ } }`

---

## GET /v1/spaces/:space_id/mentioned_discussions/me

Returns discussions where the current user is mentioned.

**Query params:** `per_page`, `page`, `by_status` (same as list)

**Response:** `{ "discussions": [ /* Discussion Objects */ ] }`

---

## POST /v1/spaces/:space_id/stories/:story_id/discussions

**Request body:**
```json
{
  "discussion": {
    "block_uid": "f7bd92e3-b309-4441-a8a0-654e499fefc8",
    "title": "Name",
    "fieldname": "name",
    "component": "feature",
    "lang": "default",
    "comment": {
      "message_json": [
        {"text": "this is a comment", "type": "text"},
        {"type": "mention", "attrs": {"id": 99734, "label": "Jane Doe"}}
      ]
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `block_uid` | string | Yes | Block UID |
| `title` | string | Yes | Field title |
| `comment.message_json` | array | Yes | `[{text, type, attrs?}]` |
| `fieldname` | string | No | Field technical name |
| `component` | string | No | Component name |
| `lang` | string | No | Language code |

**Response:** `{ "discussion": { /* Discussion Object */ } }`

---

## PUT /v1/spaces/:space_id/discussions/:discussion_id

Resolve a discussion.

**Request body:**
```json
{
  "discussion": {
    "solved_at": "2024-02-06T22:07:04.729Z"
  }
}
```

**Response:** `{ "discussion": { /* Discussion Object */ } }`

---

## DELETE /v1/spaces/:space_id/discussions/:discussion_id

**Response:** HTTP 204 No Content

---

## Comments

### GET /v1/spaces/:space_id/discussions/:discussion_uuid/comments

**Response:** `{ "comments": [ /* Comment Objects */ ] }`

### POST /v1/spaces/:space_id/discussions/:discussion_id/comments

**Request body:**
```json
{
  "comment": {
    "message_json": [
      {"text": "Hello new comment", "type": "text"}
    ]
  }
}
```

**Response:** `{ "comment": { /* Comment Object */ } }`

### PUT /v1/spaces/:space_id/discussions/:discussion_id/comments/:comment_id

Same body as POST. **Response:** Updated Comment Object.

### DELETE /v1/spaces/:space_id/discussions/:discussion_id/comments/:comment_id

**Response:** HTTP 204 No Content

---

## Endpoint summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/spaces/:sid/stories/:stid/discussions` | List discussions for story |
| GET | `/v1/spaces/:sid/discussions/:did` | Get single discussion |
| GET | `/v1/spaces/:sid/mentioned_discussions/me` | My mentioned discussions |
| POST | `/v1/spaces/:sid/stories/:stid/discussions` | Create discussion |
| PUT | `/v1/spaces/:sid/discussions/:did` | Resolve discussion |
| DELETE | `/v1/spaces/:sid/discussions/:did` | Delete discussion |
| GET | `/v1/spaces/:sid/discussions/:duuid/comments` | List comments |
| POST | `/v1/spaces/:sid/discussions/:did/comments` | Create comment |
| PUT | `/v1/spaces/:sid/discussions/:did/comments/:cid` | Update comment |
| DELETE | `/v1/spaces/:sid/discussions/:did/comments/:cid` | Delete comment |
