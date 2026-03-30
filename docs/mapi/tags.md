# Tags — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/tags

---

## The Tag Object

```json
{
  "name": "Editor's choice",
  "taggings_count": 1,
  "tag_on_stories": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Tag name (case-insensitive, unique) |
| `taggings_count` | number | Total tag instances (min 1, not 0). For deleted stories = deleted count. For unassigned = 1. |
| `tag_on_stories` | number | Stories currently associated (only visible with `all_tags` param). `0` for deleted/unassigned. |

---

## GET /v1/spaces/:space_id/tags

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by tag name |
| `all_tags` | string | Any value — shows all tags, includes `tag_on_stories` in response |
| `per_page` | number | Default 25, max 100 |
| `page` | number | Default 1 |

**Response:** `{ "tags": [ /* Tag Objects */ ] }`

---

## POST /v1/spaces/:space_id/tags

**Request body:**
```json
{
  "tag": {
    "name": "Editor's choice",
    "story_id": 202
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `tag.name` | Yes | Tag name (case-insensitive, unique) |
| `tag.story_id` | No | ID of the story to tag |

**Response:** `{ "tag": { "name": "...", "story_id": 202 } }`

---

## DELETE /v1/spaces/:space_id/tags/:tag_name

**Note:** The `:id` path param is the **tag name** (not a numeric ID).

```bash
curl -X DELETE "https://mapi.storyblok.com/v1/spaces/285923/tags/test-tag" \
  -H "Authorization: YOUR_OAUTH_TOKEN"
```

**Response:** HTTP 204 No Content
