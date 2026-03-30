# Spaces — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/spaces

---

## The Space Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID of the space |
| `name` | string | Name of the space |
| `domain` | string | Domain for the default preview URL |
| `uniq_domain` | string | Unique domain for the Storyblok Rendering Service |
| `plan` | string | Space plan name |
| `plan_level` | number | Space plan level |
| `trial` | boolean | Indicates if the space is in trial mode |
| `owner_id` | number | Numeric user ID of the space owner |
| `role` | string | Role of the current collaborator (`admin`, `editor`, or custom) |
| `owner` | object | User object of the space owner |
| `stories_count` | number | Number of stories in the space |
| `assets_count` | number | Number of assets in the space |
| `default_root` | string | Block name used as default content type for folder entries |
| `parent_id` | number | Space ID of a parent space |
| `created_at` | string | ISO 8601 timestamp |
| `story_published_hook` | string | Published webhook URL |
| `environments` | object[] | Array of `{ name, location }` objects |
| `first_token` | string | The space's oldest available preview token |
| `limits` | object | Limits of the space |
| `options` | object | Options for backup and language configuration |
| `collaborators` | object[] | Array of collaborator objects |

**`options` fields:** `branch_deployed_hook`, `s3_bucket`, `aws_arn`, `backup_frequency`, `languages`

**`collaborators[]` fields:** `id`, `user_id`, `role`, `permissions`, `allowed_paths`, `field_permissions`, `space_role_id`, `space_role_ids`, `space_id`, `user`

---

## GET /v1/spaces/:space_id

Returns a single space.

**Response:** `{ "space": { /* Space Object */ } }`

```bash
curl "https://mapi.storyblok.com/v1/spaces/285923/" \
  -H "Authorization: YOUR_OAUTH_TOKEN"
```
