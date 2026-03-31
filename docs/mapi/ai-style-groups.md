# AI Style Groups — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/ai-style-groups

---

## The AI Style Group Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Name (max 100 characters) |
| `description` | string | Description (max 400 characters) |
| `source` | string | `"Space"` or `"Org"` |
| `author` | string | Name of the user who created the group |
| `rules_count` | number | Number of AI output rules |
| `ai_output_rule_ids` | number[] | IDs of AI output rules |

---

## Space-Level Endpoints

### GET /v1/spaces/:space_id/ai_style_groups

**Response:** `{ "ai_style_groups": [ /* AI Style Group Objects */ ] }`

### GET /v1/spaces/:space_id/ai_style_groups/:style_group_id

**Response:** `{ "ai_style_group": { /* AI Style Group Object */ } }`

### POST /v1/spaces/:space_id/ai_style_groups

**Request body:**
```json
{
  "ai_style_group": {
    "name": "Marketing Style Guide",
    "description": "Brand guidelines for marketing content"
  },
  "ai_output_rule_ids": [123456, 123457]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ai_style_group.name` | string | Yes | Max 100 chars |
| `ai_style_group.description` | string | No | Max 400 chars |
| `ai_output_rule_ids` | number[] | No | Associated rule IDs |

**Response:** `{ "ai_style_group": { /* created */ } }`

### PUT /v1/spaces/:space_id/ai_style_groups/:id

Same body as POST. **Note:** `ai_output_rule_ids` **replaces** all existing rules. Pass `[]` to remove all.

**Response:** `{ "ai_style_group": { /* updated */ } }`

### DELETE /v1/spaces/:space_id/ai_style_groups/:style_group_id

**Response:** HTTP 204 No Content

### GET /v1/spaces/:space_id/default_ai_style_groups

**Response:** Collection of AI style group objects set as defaults for the space.

### PUT /v1/spaces/:space_id/default_ai_style_groups

**Request body:**
```json
{ "ai_style_group_ids": [68844418605065, 68844418605067] }
```

**Note:** Replaces all existing defaults. Pass `[]` to remove all.

---

## Organization-Level Endpoints

### GET /v1/orgs/me/ai_style_groups

**Query params:** `per_page` (default 25), `page` (default 1)

**Response:** `{ "ai_style_groups": [ /* AI Style Group Objects */ ] }`

### GET /v1/orgs/me/ai_style_groups/:ai_style_group_id

**Response:** `{ "ai_style_group": { /* AI Style Group Object */ } }`

### POST /v1/orgs/me/ai_style_groups

Same body as space-level POST.

### PUT /v1/orgs/me/ai_style_groups/:ai_style_group_id

Same body as space-level PUT.

### DELETE /v1/orgs/me/ai_style_groups/:ai_style_group_id

**Response:** HTTP 204 No Content

### GET /v1/orgs/me/default_ai_style_groups

**Response:** Collection of org-level default AI style groups.

### PUT /v1/orgs/me/default_ai_style_groups

Same body as space-level default PUT.

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/spaces/:sid/ai_style_groups` | List space AI style groups |
| GET | `/v1/spaces/:sid/ai_style_groups/:id` | Get single space AI style group |
| POST | `/v1/spaces/:sid/ai_style_groups` | Create space AI style group |
| PUT | `/v1/spaces/:sid/ai_style_groups/:id` | Update space AI style group |
| DELETE | `/v1/spaces/:sid/ai_style_groups/:id` | Delete space AI style group |
| GET | `/v1/spaces/:sid/default_ai_style_groups` | Get default AI style groups for space |
| PUT | `/v1/spaces/:sid/default_ai_style_groups` | Set default AI style groups for space |
| GET | `/v1/orgs/me/ai_style_groups` | List org AI style groups |
| GET | `/v1/orgs/me/ai_style_groups/:id` | Get single org AI style group |
| POST | `/v1/orgs/me/ai_style_groups` | Create org AI style group |
| PUT | `/v1/orgs/me/ai_style_groups/:id` | Update org AI style group |
| DELETE | `/v1/orgs/me/ai_style_groups/:id` | Delete org AI style group |
| GET | `/v1/orgs/me/default_ai_style_groups` | Get default AI style groups for org |
| PUT | `/v1/orgs/me/default_ai_style_groups` | Set default AI style groups for org |
