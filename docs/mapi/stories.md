# Stories — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/stories

---

## The Story Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name |
| `slug` | string | URL-friendly identifier |
| `full_slug` | string | Full slug including parent folders (auto-generated) |
| `path` | string | Real path from story config |
| `uuid` | string | Unique UUID |
| `group_id` | string | Shared UUID between alternate/translated stories |
| `parent_id` | number | Parent folder ID; `0` for root |
| `content` | object | Content blocks. Every nested object needs `component` + `_uid` |
| `is_folder` | boolean | Whether this is a folder |
| `is_startpage` | boolean | Whether this is the root story of its parent folder |
| `published` | boolean | Publication status |
| `unpublished_changes` | boolean | Has unpublished changes |
| `created_at` | string | ISO 8601 |
| `updated_at` | string | ISO 8601 |
| `published_at` | string | ISO 8601 last publish |
| `first_published_at` | string | ISO 8601 first publish |
| `deleted_at` | string | ISO 8601 deletion |
| `sort_by_date` | string | Datestamp for CDN API sorting |
| `tag_list` | string[] | Assigned tags |
| `position` | number | Position within folder |
| `default_root` | string | Default content type for folder |
| `disable_fe_editor` | boolean | Visual Editor disabled |
| `meta_data` | object | Non-editable data (Management API only) |
| `parent` | object | Parent folder: `{ id, slug, name, disable_fe_editor, uuid }` |
| `breadcrumbs` | object[] | `{ id, name, parent_id, path, slug }` |
| `alternates` | object[] | Alternate story objects: `{ id, name, slug, published, full_slug, is_folder, parent_id }` |
| `translated_slugs` | object[] | `{ id, lang, slug, name, published }` |
| `localized_paths` | object[] | `{ path, name, lang, published }` |
| `stage` | object | Current workflow stage: `{ workflow_id, workflow_stage_id, story_id, due_date, created_at }` |
| `user_ids` | number[] | Users assigned to current workflow stage |
| `space_role_ids` | number[] | Roles for current workflow stage |
| `release_ids` | number[] | Associated release IDs |
| `current_version_id` | number | Latest content version ID |
| `scheduled_dates` | string | ISO UTC scheduled publishing date |
| `favourite_for_user_ids` | number[] | Users who favorited this story |
| `last_author` | object | `{ id, userid, friendly_name }` |
| `last_author_id` | number | Last user who interacted |
| `preview_token` | object | `{ token, timestamp }` |

---

## GET /v1/spaces/:space_id/stories

**Note:** `content` field is excluded by default. Use `with_summary=true` for `content_summary`.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `per_page` | number | Per page |
| `sort_by` | string | `created_at:desc`, `name:asc`, `content.FIELD:asc` (append `:int`/`:float` for numeric) |
| `search` | string | Search by name, slug, full_slug |
| `text_search` | string | Full-text search incl. content object |
| `with_parent` | number | Filter by parent folder ID |
| `starts_with` | string | Filter by full_slug prefix |
| `by_ids` | string | Comma-separated IDs |
| `by_uuids` | string | Comma-separated UUIDs |
| `by_uuids_ordered` | string | UUIDs preserving input order |
| `by_slugs` | string | Full slugs, supports wildcard (`posts/*`) |
| `excluding_slugs` | string | Exclude by full_slug, supports wildcard |
| `excluding_ids` | string | Exclude by ID (comma-separated) |
| `with_tag` | string | Filter by tag (comma-separated) |
| `folder_only` | boolean | Only folders |
| `story_only` | boolean | Only non-folders |
| `in_trash` | boolean | Only deleted stories |
| `is_published` | boolean | `true` = published only, `false` = drafts only |
| `with_slug` | string | Exact full_slug match |
| `contain_component` | string | Filter by nestable block name (comma-separated) |
| `in_release` | number | Stories in release (release ID) |
| `in_workflow_stages` | number | Filter by workflow stage ID (comma-separated) |
| `mine` | boolean | Stories assigned to current user |
| `favourite` | boolean | Only favorited stories |
| `with_summary` | boolean | Include `content_summary` |
| `scheduled_at_gt` | string | Scheduled after date (ISO UTC) |
| `scheduled_at_lt` | string | Scheduled before date (ISO UTC) |
| `reference_search` | string | Search referenced stories/assets by UUID, name, or URL |
| `filter_query` | string | Filter on content fields: `?filter_query[field][op]=value` |

**Response:** `{ "stories": [ /* Story Objects without content */ ] }`

---

## GET /v1/spaces/:space_id/stories/:story_id

Returns full story including `content`.

**Response:** `{ "story": { /* Story Object */ } }`

---

## POST /v1/spaces/:space_id/stories

Creates a draft by default. Set `publish: true` to publish immediately.

**Request body:**
```json
{
  "publish": true,
  "story": {
    "name": "Story Name",
    "slug": "story-name",
    "content": {
      "component": "page",
      "body": []
    }
  },
  "release_id": 123
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `story` | Yes | Story object |
| `story.name` | Yes | Display name |
| `story.slug` | Yes | URL slug |
| `story.content` | Yes | Content object; every nested object needs `component` + `_uid` |
| `publish` | No | `true` = publish immediately |
| `release_id` | No | Associate with release |

**Response:** `{ "story": { /* created Story Object */ } }`

---

## PUT /v1/spaces/:space_id/stories/:story_id

**Note:** `publish: false` saves changes but does NOT unpublish. Use `/unpublish` for that.

**Request body:**
```json
{
  "publish": true,
  "force_update": "1",
  "story": { "id": 2141, "name": "...", "slug": "...", "content": {} },
  "release_id": 123,
  "lang": "de"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `story` | Yes | Full story object |
| `publish` | No | `true` = publish |
| `force_update` | No | `"1"` = bypass story lock (no effect if locked by workflow) |
| `release_id` | No | Release ID |
| `group_id` | No | UUID for alternate stories |
| `lang` | No | Language code for individual language publish |

**Response:** `{ "story": { /* updated Story Object */ } }`

---

## DELETE /v1/spaces/:space_id/stories/:story_id

**Response:** `{ "story": { /* deleted Story Object */ } }`

---

## GET /v1/spaces/:space_id/stories/:story_id/publish

**IMPORTANT: Uses GET method, not POST/PUT.**

**Query params:** `lang` — comma-separated language codes (requires "Publish translations individually" in settings)

**Request body (optional):** `{ "release_id": 123 }`

---

## GET /v1/spaces/:space_id/stories/:story_id/unpublish

**IMPORTANT: Uses GET method, not POST/PUT.**

**Query params:** `lang` — comma-separated language codes
