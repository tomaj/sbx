# Getting Started — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/getting-started

---

## Base URLs (Region-Specific)

| Region | Base URL |
|--------|----------|
| EU | `https://mapi.storyblok.com/v1` |
| US | `https://api-us.storyblok.com/v1` |
| Canada | `https://api-ca.storyblok.com/v1` |
| Australia | `https://api-ap.storyblok.com/v1` |
| China | `https://app.storyblokchina.cn/v1` |

The Management API allows you to create, edit, update, and delete content. It is **not** backed by the CDN — use the CDN API for content consumption (lower latency).

---

## Authentication

Two token types:

### Personal Access Token
- Grants access to **all spaces** associated with your account
- No expiry; not space-specific
- Obtained from: Storyblok account settings > Token tab
- Header (no `Bearer` prefix):
  ```
  Authorization: YOUR_PERSONAL_ACCESS_TOKEN
  ```

### OAuth Access Token
- Tied to a **single space**, time-limited, with granular scopes
- Scopes: `read_content`, `write_content`, etc.
- Obtained via OAuth 2.0 Authorization Flow
- Header (with `Bearer` prefix):
  ```
  Authorization: Bearer YOUR_OAUTH_ACCESS_TOKEN
  ```

**Never expose personal access tokens in frontend code or version control.**

---

## HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 400 | Bad Request — wrong format (e.g. XML instead of JSON) |
| 401 | Unauthorized — no valid API key |
| 404 | Not Found — resource doesn't exist |
| 422 | Unprocessable Entity — missing required parameter |
| 429 | Too Many Requests — rate limit exceeded |
| 500/502/503/504 | Server Error |

---

## Pagination

Applied to all top-level resources.

**Query params:**

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `page` | 1 | — | Page number |
| `per_page` | 25 | 100 (1000 for datasource entries) | Items per page |

**Response headers:**
- `total` — total number of items
- `per_page` — items per page

Total pages = `ceil(total / per_page)`. Requesting beyond last page returns an empty array.

---

## Rate Limits

| Plan | Limit |
|------|-------|
| Starter | 3 calls/second |
| Growth / Growth Plus / Premium / Elite | 6 calls/second |

HTTP 429 when exceeded. Use exponential backoff.
