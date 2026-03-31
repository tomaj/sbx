# Webhooks — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/webhooks

Base path: `/v1/spaces/:space_id/webhook_endpoints`

---

## The Webhook Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Human-readable name (e.g. "Rebuild Website") |
| `description` | string | Brief description |
| `endpoint` | string | Target URL that receives webhook POST requests |
| `space_id` | number | Associated space ID |
| `secret` | string | Signing secret for request validation |
| `actions` | string[] | Event types that trigger this webhook |
| `activated` | boolean | Whether the webhook is active |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `deleted_at` | string | ISO 8601 timestamp, null if active |

---

## Available `actions` values

| Value | Trigger |
|-------|---------|
| `story.published` | Story published |
| `story.unpublished` | Story unpublished |
| `story.deleted` | Story deleted |
| `story.moved` | Story/folder moved |
| `datasource.entries_updated` | Datasource entries modified |
| `asset.created` | Asset uploaded |
| `asset.replaced` | Asset replaced |
| `asset.deleted` | Asset deleted |
| `asset.restored` | Asset restored |
| `user.added` | User added to space |
| `user.removed` | User removed from space |
| `user.roles_updated` | User's roles updated |
| `stage.changed` | Workflow stage changed |
| `pipeline.deployed` | Release/pipeline deployed |
| `release.merged` | Release merged |

---

## GET /v1/spaces/:space_id/webhook_endpoints

**Response:** `{ "webhook_endpoints": [ /* Webhook Objects */ ] }`

---

## GET /v1/spaces/:space_id/webhook_endpoints/:webhook_endpoint_id

**Response:** `{ "webhook_endpoint": { /* Webhook Object */ } }`

---

## POST /v1/spaces/:space_id/webhook_endpoints

**Request body:**
```json
{
  "webhook_endpoint": {
    "name": "Rebuild Website",
    "endpoint": "https://apiendpoint.com",
    "actions": ["story.published"],
    "activated": true,
    "secret": ""
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `webhook_endpoint.name` | string | Yes | Descriptive name |
| `webhook_endpoint.endpoint` | string | Yes | Target URL |
| `webhook_endpoint.actions` | string[] | Yes | List of trigger events |
| `webhook_endpoint.activated` | boolean | Yes | Enable/disable |
| `webhook_endpoint.secret` | string | No | Signing secret |
| `webhook_endpoint.description` | string | No | Description |

**Response:** `{ "webhook_endpoint": { /* created Webhook Object */ } }`

---

## PUT /v1/spaces/:space_id/webhook_endpoints/:webhook_endpoint_id

Same body as POST. All fields optional.

**Response:** `{ "webhook_endpoint": { /* updated Webhook Object */ } }`

---

## DELETE /v1/spaces/:space_id/webhook_endpoints/:webhook_endpoint_id

**Response:** HTTP 204 No Content
