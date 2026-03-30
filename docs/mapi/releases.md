# Releases — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/releases

---

## The Release Object

```json
{
  "release": {
    "id": 123212,
    "uuid": "f4ea2f30-4645-4164-9826-3860215f0caq",
    "name": "A Winter Special Release",
    "release_at": null,
    "released": false,
    "timezone": "Europe/Berlin",
    "branches_to_deploy": [32324],
    "created_at": "2025-12-10T11:57:15.188Z",
    "updated_at": "2025-12-14T16:14:01.700Z",
    "owner_id": 444444,
    "users_to_notify_ids": ["444444"],
    "public": false,
    "allowed_user_ids": [444444],
    "allowed_space_role_ids": [12345678901234],
    "allowed_api_key_ids": [987654321]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `uuid` | string | Unique UUID |
| `name` | string | Name of the release |
| `release_at` | string\|null | Scheduled deployment timestamp (`YYYY-MM-DD HH:MM`) |
| `released` | boolean | `true` when published |
| `timezone` | string | Timezone (e.g. `Europe/Berlin`) |
| `branches_to_deploy` | number[] | Branch/pipeline stage IDs to deploy with this release |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `owner_id` | number | Owner user ID |
| `users_to_notify_ids` | string[] | User IDs to notify |
| `public` | boolean | Accessible to all users in space (default `true`) |
| `allowed_user_ids` | number[] | Users allowed to access this release |
| `allowed_space_role_ids` | number[] | Space role IDs allowed |
| `allowed_api_key_ids` | number[] | `release`-type access token IDs |

---

## GET /v1/spaces/:space_id/releases

**Query params:** `branch_id` (number, optional) — filter by pipeline stage

**Response:** `{ "releases": [ /* Release Objects */ ] }`

---

## GET /v1/spaces/:space_id/releases/:release_id

**Response:** `{ "release": { /* Release Object */ } }`

---

## POST /v1/spaces/:space_id/releases

**Request body:**
```json
{
  "release": {
    "name": "Summer Special",
    "release_at": "2025-01-01 01:01",
    "branches_to_deploy": [123, 456]
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `release.name` | Yes | Name |
| `release.release_at` | Yes | Scheduled time (`YYYY-MM-DD HH:MM`) |
| `release.branches_to_deploy` | Yes | Branch IDs |

**Response:** `{ "release": { /* created Release Object */ } }`

---

## PUT /v1/spaces/:space_id/releases/:release_id

**Request body:**
```json
{
  "do_release": true,
  "release": {
    "name": "Summer Special",
    "release_at": "2025-01-01 01:01",
    "branches_to_deploy": [123, 456]
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `do_release` | No | `true` = publish/deploy the release immediately |
| `release.name` | No | Updated name |
| `release.release_at` | No | Updated scheduled time |
| `release.branches_to_deploy` | No | Updated branch IDs |

**Response:** `{ "release": { /* updated Release Object */ } }`

---

## DELETE /v1/spaces/:space_id/releases/:release_id

**Response:** `{ "release": { /* deleted Release Object */ } }`
