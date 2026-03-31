# OAuth 2.0 — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/oauth

Used by Tool Plugins and Custom Sidebar Apps to interact with the Management API via OAuth 2.0 Authorization Code + PKCE flow.

---

## Regional Base URLs

| Region | OAuth Base URL |
|--------|----------------|
| EU | `https://api.storyblok.com/oauth` |
| US | `https://api-us.storyblok.com/oauth` |
| Canada | `https://api-ca.storyblok.com/oauth` |
| Australia | `https://api-ap.storyblok.com/oauth` |
| China | `https://app.storyblokchina.cn/oauth` |

**Region detection:** `spaceId < 1,000,000` = EU; `spaceId >= 1,000,000` = US.

---

## Authorization Flow

### Step 1 — Plugin Entry Point

On load, if not inside an iframe, redirect to:
- Space Plugin: `https://app.storyblok.com/oauth/app_redirect`
- Tool Plugin: `https://app.storyblok.com/oauth/tool_redirect`

### Step 2 — Authorization Request

**GET** `https://app.storyblok.com/oauth/authorize`

**Query params:**

| Parameter | Description |
|-----------|-------------|
| `client_id` | Application client ID |
| `response_type` | Must be `code` |
| `redirect_uri` | Callback URL |
| `scope` | Permissions e.g. `read_content write_content` |
| `state` | Random UUID for CSRF protection |
| `code_challenge` | SHA256-hashed PKCE challenge |
| `code_challenge_method` | Must be `S256` |

### Step 3 — Authorization Response

Redirect to: `{redirect_uri}?code={code}&state={state}&space_id={space_id}`

### Step 4 — Exchange Code for Access Token

**POST** `https://app.storyblok.com/oauth/token` (EU)
**POST** `https://app.storyblok.com/v1_us/token` (US)

**Request body:**

| Field | Description |
|-------|-------------|
| `grant_type` | `authorization_code` |
| `code` | Authorization code from Step 3 |
| `client_id` | Application client ID |
| `client_secret` | Application client secret |
| `redirect_uri` | Same URI from Step 2 |

**Response:**
```json
{
  "access_token": "<ACCESS_TOKEN>",
  "refresh_token": "<REFRESH_TOKEN>",
  "token_type": "bearer",
  "expires_in": 899
}
```

### Step 5 — Refresh Token

**POST** same token endpoint as Step 4.

| Field | Description |
|-------|-------------|
| `grant_type` | `refresh_token` |
| `refresh_token` | Refresh token from Step 4 |
| `client_id` | Application client ID |
| `client_secret` | Application client secret |
| `redirect_uri` | Same redirect URI |

---

## GET /oauth/user_info

`https://api.storyblok.com/oauth/user_info` (EU) — also at `/v1/user_info`

**Headers:** `Authorization: Bearer <ACCESS_TOKEN>`

**Response:**
```json
{
  "user": {
    "friendly_name": "My name",
    "id": 20
  },
  "roles": [
    { "name": "admin" }
  ]
}
```

---

## GET /oauth/space_info

`https://api.storyblok.com/oauth/space_info` (EU)

**Headers:** `Authorization: Bearer <ACCESS_TOKEN>`

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `space.id` | number | Space ID |
| `space.name` | string | Display name |
| `space.domain` | string | Domain URL |
| `space.plan_level` | number | Subscription tier |
| `space.owner` | object | Owner details (id, email, username, firstname, lastname, role, org_role, timezone, lang, avatar, phone, disabled, preferences) |
| `space.languages` | array | `[{code, name}]` supported languages |
