# Collaborators — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/collaborators

---

## The Collaborator Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Collaborator record ID |
| `role` | string | `admin`, `editor`, or custom role name |
| `user_id` | number | Numeric user ID |
| `space_role_id` | number | Single custom role ID |
| `space_role_ids` | number[] | Multiple custom role IDs |
| `space_id` | number | Space ID |
| `allowed_path` | number[] | Story IDs accessible; empty = all accessible |
| `field_permissions` | string[] | Hidden fields; empty = all visible |
| `permissions` | string[] | Permission strings (see below) |
| `user` | object | Nested user object |

**Nested `user` object:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | User ID |
| `firstname` | string | First name |
| `lastname` | string | Last name |
| `userid` | string | Email-based user identifier |
| `real_email` | string | Primary email |
| `alt_email` | string | Alternative email |
| `friendly_name` | string | Display name |
| `avatar` | string | Profile image URL |
| `disabled` | boolean | Active/inactive |

**Available `permissions` values:**

| Value | Category |
|-------|----------|
| `read_stories` | Content |
| `save_stories` | Content |
| `publish_stories` | Content |
| `delete_stories` | Content |
| `edit_image` | Assets |
| `hide_asset_folders` | Assets |
| `manage_tags` | Admin |
| `edit_datasources` | Admin |
| `view_content` | Access |
| `view_folders` | Access |
| `view_draft_json` | Access |

---

## GET /v1/spaces/:space_id/collaborators

**Query params:** `per_page` (default 25, max 100), `page` (default 1)

**Response:** `{ "collaborators": [ /* Collaborator Objects */ ] }`

---

## DELETE /v1/spaces/:space_id/collaborators/:collaborator_id

Also accepts `:sso_id` in place of `:collaborator_id` for SSO-provisioned users.

**Response:** HTTP 204 No Content
