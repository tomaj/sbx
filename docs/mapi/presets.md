# Presets — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/presets

---

## The Preset Object

```json
{
  "preset": {
    "id": 1231,
    "name": "PresetGrid",
    "preset": { "headline": "preset grid creation" },
    "component_id": 1414141,
    "space_id": 123123,
    "created_at": "2023-08-22T19:31:04.103Z",
    "updated_at": "2023-08-22T19:31:04.103Z",
    "image": null,
    "color": "#00b3b0",
    "icon": "block-image",
    "description": null
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name |
| `preset` | object | Component fields with default values (key-value, matches component schema) |
| `component_id` | number | Component this preset belongs to |
| `space_id` | number | Space ID |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `image` | string\|null | Preview image URL |
| `color` | string | Hex color (e.g. `#00b3b0`) |
| `icon` | string | Icon identifier |
| `description` | string\|null | Description for editors |

---

## GET /v1/spaces/:space_id/presets

**Query params:** `component_id` (number, optional) — filter by component

**Response:** `{ "presets": [ /* Preset Objects */ ] }`

---

## GET /v1/spaces/:space_id/presets/:preset_id

**Response:** `{ "preset": { /* Preset Object */ } }`

---

## POST /v1/spaces/:space_id/presets

**Request body:**
```json
{
  "preset": {
    "name": "Teaser with filled headline",
    "component_id": 62,
    "preset": { "headline": "Default headline value" }
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `preset.name` | Yes | Display name |
| `preset.component_id` | Yes | Component ID |
| `preset.preset` | Yes | Field defaults object |

**Response:** `{ "preset": { /* created Preset Object */ } }`

---

## PUT /v1/spaces/:space_id/presets/:preset_id

**Request body:** Same structure as POST, all fields optional.

**Response:** `{ "preset": { /* updated Preset Object */ } }`

---

## DELETE /v1/spaces/:space_id/presets/:preset_id

**Response:** `{ "preset": { /* deleted Preset Object */ } }`
