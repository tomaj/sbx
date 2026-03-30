# Components & Component Groups — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/components

---

## The Component Object

```json
{
  "component": {
    "id": 3672886,
    "name": "banner_section",
    "display_name": null,
    "created_at": "2025-03-27T10:35:25.086Z",
    "updated_at": "2025-07-04T08:30:54.235Z",
    "schema": {
      "headline": { "type": "text", "pos": 0, "translatable": true }
    },
    "image": null,
    "preview_field": null,
    "is_root": false,
    "is_nestable": true,
    "preview_tmpl": null,
    "all_presets": [],
    "preset_id": null,
    "real_name": "banner_section",
    "component_group_uuid": "19cb297f-541a-4a23-b02e-66d08e5f6323",
    "color": "#fbce41",
    "icon": "block-icon",
    "internal_tags_list": [{ "id": 43211, "name": "test" }],
    "internal_tag_ids": ["43211"],
    "content_type_asset_preview": null
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID (read-only) |
| `name` | string | Technical identifier. `"content"` is reserved. |
| `display_name` | string | Human-readable name in editor |
| `created_at` | string | ISO 8601 (read-only) |
| `updated_at` | string | ISO 8601 (read-only) |
| `schema` | object | Key-value map: field_key → field config object |
| `image` | string\|null | Preview image URL |
| `preview_field` | string | Field key used for UI preview |
| `is_root` | boolean | Can be used as content type block |
| `is_nestable` | boolean | Can be nested in other components |
| `preview_tmpl` | string | Preview template string |
| `all_presets` | object[] | Preset configurations |
| `preset_id` | number\|null | Default preset ID |
| `real_name` | string | `display_name` or `name` if no display_name (read-only) |
| `component_group_uuid` | string | UUID of folder this component belongs to |
| `icon` | string | Icon identifier |
| `color` | string | Hex color |
| `internal_tags_list` | object[] | `[{ id, name }]` |
| `internal_tag_ids` | string[] | Internal tag IDs |
| `content_type_asset_preview` | string | Asset field for content type preview |

**Type rules:**
- `is_root: true, is_nestable: false` → content type block
- `is_root: false, is_nestable: true` → nestable block
- `is_root: false, is_nestable: false` → universal block

---

## Schema Field Object

The `schema` on a component is a map of `field_key → field_config`. Common properties:

| Property | Type | Description |
|----------|------|-------------|
| `type` | string | Field type: `text`, `textarea`, `richtext`, `markdown`, `number`, `datetime`, `boolean`, `options`, `option`, `asset`, `multiasset`, `multilink`, `section`, `custom`, `bloks`, `table` |
| `pos` | number | Display position |
| `id` | string | UUID |
| `required` | boolean | Mandatory field |
| `description` | string | Helper text |
| `tooltip` | boolean | Show description as tooltip |
| `translatable` | boolean | Enable translation |
| `default_value` | string | Initial value |
| `display_name` | string | Editor label |

**`bloks` type extras:** `maximum`, `minimum`, `restrict_components`, `component_whitelist`, `component_denylist`, `component_group_whitelist`

**`options`/`option` extras:** `source` (`internal`, `internal_stories`, `external`, `internal_languages`), `datasource_slug`, `external_datasource`, `folder_slug`, `use_uuid`, `options[]`, `max_options`, `min_options`

**`asset` extras:** `filetypes` (`images`, `videos`, `audios`, `texts`), `asset_folder_id`, `allow_external_url`

**`multilink` extras:** `email_link_type`, `asset_link_type`, `show_anchor`, `restrict_content_types`, `component_whitelist`, `force_link_scope`, `link_scope`

**`text` extras:** `max_length`, `regex`, `rtl`, `no_translate`

**`richtext` extras:** `customize_toolbar`, `toolbar`, `allow_target_blank`, `rich_markdown`

**`number` extras:** `min_value`, `max_value`, `decimals`, `steps`

**`section` (group) extras:** `keys[]` — field keys to display in this group

**`custom` (plugin) extras:** `field_type` — name of the plugin

---

## GET /v1/spaces/:space_id/components

**Note:** Response includes both `components` AND `component_groups` — no separate call needed.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `by_ids` | string | Comma-separated component IDs |
| `sort_by` | string | e.g. `name:asc`, `updated_at:desc`, `is_nestable:asc,is_root:desc` |
| `is_root` | boolean | `true` = content types only, `false` = nestable only |
| `search` | string | Search by `name` or `display_name` |
| `in_group` | string | Filter by component group UUID |

**Response:**
```json
{
  "components": [ /* Component Objects */ ],
  "component_groups": [ /* Component Group Objects */ ]
}
```

---

## GET /v1/spaces/:space_id/components/:component_id

**Response:** `{ "component": { /* Component Object */ } }`

---

## POST /v1/spaces/:space_id/components

**Request body:**
```json
{
  "component": {
    "name": "banner_section",
    "display_name": "Banner Section",
    "is_nestable": true,
    "is_root": false,
    "schema": {
      "headline": { "type": "text", "pos": 0 }
    },
    "component_group_id": "uuid-here"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `component.name` | Yes | Technical name. `"content"` reserved. |
| `component.schema` | No | Field configs |
| `component.is_root` | No | Content type flag |
| `component.is_nestable` | No | Nestable flag |
| `component.component_group_id` | No | Folder ID (numeric string) |

**Response:** `{ "component": { /* created Component Object */ } }`

---

## PUT /v1/spaces/:space_id/components/:component_id

**Note:** Updating schema does NOT retroactively update content in existing stories.

Same body structure as POST, all fields optional. Include `id` in the component object.

**Response:** `{ "component": { /* updated Component Object */ } }`

---

## DELETE /v1/spaces/:space_id/components/:component_id

**Note:** Deleting a component does NOT remove its data from stories — content remains but loses schema definition.

**Response:** `{ "component": { /* deleted Component Object */ } }`

---

## The Component Group Object

```json
{
  "component_group": {
    "id": 194280,
    "name": "Authors",
    "uuid": "c98d1176-3e21-4da8-9a54-ed1558989e0a",
    "parent_id": 188786,
    "parent_uuid": "19323-32144-23423-42314"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name |
| `uuid` | string | UUID (used in `component_group_uuid` on component) |
| `parent_id` | number\|null | Parent group ID (null = root) |
| `parent_uuid` | string\|null | Parent group UUID |

---

## GET /v1/spaces/:space_id/component_groups

**Query params:** `search` (by name), `with_parent` (filter by parent_id)

**Response:** `{ "component_groups": [ /* Component Group Objects */ ] }`

---

## POST /v1/spaces/:space_id/component_groups

```json
{ "component_group": { "name": "Teasers", "parent_id": 123123 } }
```

**Response:** `{ "component_group": { /* created */ } }`

---

## PUT /v1/spaces/:space_id/component_groups/:component_group_id

```json
{ "component_group": { "name": "Updated Name", "parent_id": 123123 } }
```

---

## DELETE /v1/spaces/:space_id/component_groups/:component_group_id

HTTP 200, empty body.

---

## Key notes

- `GET /components` always returns `component_groups` in the same response — no separate list call needed
- `component_group_uuid` (UUID string) is used on the component object to reference its folder
- `component_group_id` (numeric) is used when creating/updating a component to assign it to a folder
- Endpoint uses plural: `/component_groups/` (not `/component-groups/`)
