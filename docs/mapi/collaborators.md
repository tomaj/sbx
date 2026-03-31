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
`read_stories`, `save_stories`, `publish_stories`, `unpublish_stories`, `delete_stories`, `edit_image`, `view_composer`, `hide_asset_folders`, `manage_tags`, `edit_datasources`, `view_content`, `view_folders`, `view_draft_json` (and many more — see space-roles.md for full list)

---

## GET /v1/spaces/:space_id/collaborators

**Query params:** `per_page` (default 25, max 100), `page` (default 1)

**Response:** `{ "collaborators": [ /* Collaborator Objects */ ] }`

**Note:** There is no "retrieve single collaborator" endpoint.

---

## POST /v1/spaces/:space_id/collaborators

Invite a collaborator by email. Request body is **not wrapped** in a key (root-level fields):

```json
{
  "email": "user@example.com",
  "role": "editor",
  "space_role_id": null,
  "space_role_ids": [],
  "permissions": [],
  "allow_multiple_roles_creation": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Collaborator's email |
| `role` | string | Yes | `admin`, `editor`, or custom role name |
| `space_role_id` | number | No | Single custom role ID |
| `space_role_ids` | number[] | No | Multiple custom role IDs |
| `permissions` | string[] | No | Permission strings |
| `allow_multiple_roles_creation` | boolean | No | Enable multi-role assignment |

**Response:** Created collaborator object (includes `invitation` sub-object; `user` is null until accepted).

**To add with SSO**, wrap body in `collaborator` object:
```json
{
  "collaborator": {
    "email": "api@storyblok.com",
    "role": "editor",
    "space_role_id": 18,
    "sso_id": "123456789"
  }
}
```

---

## PUT /v1/spaces/:space_id/collaborators/:collaborator_id

Update a collaborator's roles and permissions. Body wrapped in `collaborator`:

```json
{
  "collaborator": {
    "role": "editor",
    "space_role_id": 49707,
    "space_role_ids": [],
    "permissions": []
  }
}
```

**Response:** Updated collaborator object.

---

## DELETE /v1/spaces/:space_id/collaborators/:collaborator_id

Also accepts `:sso_id` in place of `:collaborator_id` for SSO-provisioned users.

**Response:** HTTP 204 No Content
