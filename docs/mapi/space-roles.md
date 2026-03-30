# Space Roles — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/space-roles

Base path: `/v1/spaces/:space_id/space_roles`

---

## The Space Role Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `role` | string | Role name (e.g. `admin`, `editor`, or custom) |
| `subtitle` | string | Description |
| `permissions` | string[] | Array of permission strings (see below) |
| `allowed_paths` | number[] | Story IDs accessible (empty = all) |
| `blocked_paths` | number[] | Story IDs blocked |
| `resolved_allowed_paths` | string[] | Slugs of `allowed_paths` stories |
| `resolved_blocked_paths` | string[] | Slugs of `blocked_paths` stories |
| `allowed_field_permissions` | string[] | Fields visible to this role (empty = all) |
| `field_permissions` | string[] | Fields hidden from this role |
| `readonly_field_permissions` | string[] | Read-only fields for this role |
| `datasource_ids` | number[] | Accessible datasource IDs |
| `blocked_datasource_ids` | number[] | Blocked datasource IDs |
| `allowed_component_ids` | number[] | Component IDs allowed in Visual Editor |
| `component_ids` | number[] | Component IDs blocked from Visual Editor |
| `component_group_uuids` | string[] | Component group UUIDs allowed in Visual Editor |
| `blocked_component_group_uuids` | string[] | Component group UUIDs blocked |
| `managed_component_ids` | number[] | Component IDs the role can edit/duplicate/delete |
| `blocked_manage_component_ids` | number[] | Component IDs the role cannot manage |
| `managed_component_group_uuids` | string[] | Component group UUIDs the role can manage |
| `blocked_manage_component_group_uuids` | string[] | Component group UUIDs blocked from management |
| `branch_ids` | number[] | Pipeline IDs the role can deploy |
| `blocked_branch_ids` | number[] | Pipeline IDs blocked |
| `allowed_languages` | string[] | Language codes accessible |
| `blocked_languages` | string[] | Language codes blocked |
| `asset_folder_ids` | number[] | Asset folder IDs accessible |
| `blocked_asset_folder_ids` | number[] | Asset folder IDs blocked |

---

## Permissions enum values

| Permission | Description |
|------------|-------------|
| `read_stories` | Read-only access to stories |
| `save_stories` | Edit and save stories |
| `publish_stories` | Publish stories |
| `unpublish_stories` | Unpublish stories |
| `publish_folders` | Publish folders (incl. contained stories) |
| `unpublish_folders` | Unpublish folders |
| `deploy_stories` | Deploy pipeline stories |
| `delete_stories` | Permanently delete stories |
| `allow_space_duplication` | Can duplicate the space |
| `edit_image` | Edit images in Image Editor |
| `view_composer` | Use the Visual Editor |
| `change_alternate_group` | Change alternate content groupings |
| `move_story` | Move stories between folders |
| `edit_story_slug` | Edit a story URL |
| `force_release` | Story must be part of a release |
| `private_releases_full_access` | Full access to any private release |
| `view_content` | Hides all stories except `allowed_paths` |
| `view_folders` | Hides all folders except `allowed_paths` |
| `view_draft_json` | View draft JSON payload |
| `view_published_json` | View published JSON payload |
| `manage_tags` | Create, edit, or delete tags |
| `edit_datasources` | Edit datasources |
| `edit_datasource_keys` | Edit datasource keys |
| `access_commerce` | Access e-commerce features |
| `access_tasks` | Access tasks |
| `execute_tasks` | Trigger tasks |
| `create_tasks` | Create tasks |
| `delete_tasks` | Delete tasks |
| `edit_tasks` | Edit tasks |
| `restrict_dimensionsapp` | Cannot access Dimensions App |
| `restrict_dimensionsapp_clone` | Cannot clone in Dimensions App |
| `restrict_dimensionsapp_overwrite` | Cannot overwrite in Dimensions App |
| `restrict_dimensionsapp_merge` | Cannot merge in Dimensions App |
| `manage_concepts` | Create, edit, or delete concepts |
| `manage_block_library` | Create, move, and edit blocks and folders |
| `apply_to_block_subfolders` | Apply block permissions to sub-items |
| `deny_uploading_assets` | Cannot upload assets |
| `deny_editing_assets` | Cannot edit assets |
| `deny_deleting_assets` | Cannot delete assets |
| `deny_moving_assets` | Cannot move assets |
| `deny_creating_asset_folders` | Cannot create asset folders |
| `deny_updating_asset_folders` | Cannot change asset folders |
| `deny_moving_asset_folders` | Cannot move assets between folders |
| `deny_deleting_asset_folders` | Cannot delete asset folders |
| `manage-non-translatable-fields` | Edit non-translatable fields only in default language |
| `deny_component_technical_name_update` | Cannot change block's technical name |
| `deny_component_fields_name_update` | Cannot change field's technical name |
| `hide_asset_folders` | Hides all assets/folders except `asset_folder_ids` |

---

## GET /v1/spaces/:space_id/space_roles

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by role name |
| `by_ids` | string | Filter by IDs (comma-separated) |

**Response:** `{ "space_roles": [ /* Space Role Objects */ ] }`

---

## GET /v1/spaces/:space_id/space_roles/:space_role_id

**Response:** `{ "space_role": { /* Space Role Object */ } }`

---

## POST /v1/spaces/:space_id/space_roles

**Request body:**
```json
{
  "space_role": {
    "role": "Test role",
    "subtitle": "Description",
    "permissions": ["publish_stories", "manage_block_library"],
    "allowed_paths": [43097198],
    "blocked_paths": [],
    "allowed_languages": ["default", "de"],
    "field_permissions": ["article.title"],
    "readonly_field_permissions": ["hero.RichText_type"],
    "datasource_ids": [2189],
    "component_ids": [57584],
    "branch_ids": [304011],
    "asset_folder_ids": [56328]
  }
}
```

**Response:** `{ "space_role": { /* Space Role Object */ } }`

---

## PUT /v1/spaces/:space_id/space_roles/:space_role_id

Same body as POST. All fields optional.

**Response:** `{ "space_role": { /* Space Role Object */ } }`

---

## DELETE /v1/spaces/:space_id/space_roles/:space_role_id

**Response:** `{ "space_role": { /* deleted Space Role Object */ } }`

---

## Key notes

- `allowed_paths` and `asset_folder_ids` etc. are allow-lists: empty = no restriction
- `blocked_*` fields are deny-lists
- `field_permissions` format: `"component_name.field_name"` (dot notation)
- `allowed_field_permissions` vs `field_permissions`: visible vs hidden fields
