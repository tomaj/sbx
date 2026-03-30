# Access Tokens (API Keys) — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/access-tokens

Base path: `/v1/spaces/:space_id/api_keys`

---

## The Access Token Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID of the token |
| `access` | string | Token type: `public`, `private` (preview), `theme`, or `release` |
| `branch_id` | number | Associated branch ID; requires Pipeline App (`null` otherwise) |
| `name` | string | Human-readable name of the access token |
| `space_id` | number | Numeric ID of the space |
| `token` | string | The actual token string |
| `story_ids` | number[] | Story IDs accessible via this token; requires Access Token Scopes App |
| `min_cache` | number | Minimum CDN cache TTL in seconds. Default: `0` |
| `release_ids` | number[] | Associated release IDs; requires Releases App and release set to Restricted |

---

## GET /v1/spaces/:space_id/api_keys

Retrieve all access tokens for a space. Response is **not paginated** — all tokens returned at once.

**Response:** `{ "api_keys": [ /* Access Token Objects */ ] }`

---

## GET /v1/spaces/:space_id/api_keys/:access_token_id

**Response:** `{ "api_key": { /* Access Token Object */ } }`

---

## POST /v1/spaces/:space_id/api_keys

**Request body:**
```json
{
  "api_key": {
    "access": "public",
    "name": "My public Access token"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `api_key.access` | string | Yes | `public`, `private`, `theme`, or `release` |
| `api_key.name` | string | Yes | Human-readable name |

**Response:** `{ "api_key": { /* Access Token Object */ } }`

---

## PUT /v1/spaces/:space_id/api_keys/:access_token_id

Same body as POST. All fields optional.

**Response:** `{ "api_key": { /* updated Access Token Object */ } }`

---

## DELETE /v1/spaces/:space_id/api_keys/:access_token_id

**Response:** `{ "api_key": { /* deleted Access Token Object */ } }`

---

## Key notes

- Token type `private` = preview token (gives access to draft content)
- `release_ids` only works when the release is set to "Restricted" mode
- List endpoint returns all tokens without pagination
