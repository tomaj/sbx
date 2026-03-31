# Field Plugins — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/field-plugins

Base path: `/v1/field_types`
Also available at `/v1/org_field_types/` (org) and `/v1/partner_field_types/` (partner).

---

## The Field Plugin Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Unique name; personal prefix recommended |
| `body` | string | Uncompiled JavaScript source code |
| `compiled_body` | string | Used by online code editor; empty for local dev |
| `space_ids` | number[] | Space IDs this plugin is assigned to |
| `options` | object[] | Plugin option configurations |
| `options[].name` | string | Option name identifier |
| `options[].value` | string | Option default value |
| `last_versions` | object[] | Version history |
| `last_versions[].id` | number | Version ID |
| `last_versions[].event` | string | Event type |
| `last_versions[].created_at` | string | Creation timestamp |
| `last_versions[].author_id` | number | Author user ID |
| `last_versions[].author` | string | Author name |
| `last_versions[].item_id` | number | Plugin ID |
| `last_versions[].is_draft` | boolean | Draft status |
| `belongs_to_partner` | boolean | Belongs to a partner portal |
| `belongs_to_org` | boolean | Belongs to an organization |
| `user` | object | Plugin owner user object |

---

## GET /v1/field_types

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `only_mine` | number | `1` | Filter by current user's plugins |
| `page` | number | `1` | Page number |
| `per_page` | number | `25` | Max `100` |
| `search` | string | — | Filter by name |

**Response:** `{ "field_types": [ /* Field Plugin Objects */ ] }`

---

## GET /v1/field_types/:field_type_id

**Response:** `{ "field_type": { /* Field Plugin Object */ } }`

---

## POST /v1/field_types

**Request body:**
```json
{
  "field_type": {
    "name": "my-geo-selector",
    "body": "/* uncompiled JS source */",
    "compiled_body": ""
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field_type.name` | string | Yes | Unique name; personal prefix recommended |
| `field_type.body` | string | No | Uncompiled JavaScript source |
| `field_type.compiled_body` | string | No | Online editor compiled code |

**Response:** `{ "field_type": { /* created Field Plugin Object */ } }`

---

## PUT /v1/field_types/:field_type_id

**Request body:**
```json
{
  "field_type": {
    "body": "/* updated source */",
    "compiled_body": "",
    "space_ids": [12345],
    "options": [
      { "name": "api_key", "value": "" }
    ]
  },
  "publish": 1
}
```

| Field | Type | Description |
|-------|------|-------------|
| `field_type.body` | string | Uncompiled JavaScript |
| `field_type.compiled_body` | string | Online editor compiled code |
| `field_type.space_ids` | number[] | Space IDs to assign plugin to |
| `field_type.options` | object[] | Plugin options |
| `publish` | number | When set, publishes the field plugin |

**Response:** Updated Field Plugin Object.

---

## DELETE /v1/field_types/:field_type_id

**Response:** Standard empty/confirmation response.
