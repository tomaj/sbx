# Statistics — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/statistics

---

## GET /v1/orgs/me/statistics/:all_traffic

Retrieve API traffic statistics for the organization.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `start_date` | string | Start date — `YYYY-MM-DD` |
| `end_date` | string | End date — `YYYY-MM-DD` |
| `group_by` | string | Aggregate by `day`, `month`, or `year` (default: `month`) |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `montly_traffic_limit` | number | Monthly API request cap |
| `yearly_traffic_limit` | number | Annual cap (12x monthly) |
| `traffic_used_this_year` | number | Cumulative annual consumption |
| `cumulated_traffic` | object | Aggregated usage metrics |
| `traffic_top_spaces` | object | High-consumption spaces by space ID |
| `traffic` | array | Per-space breakdown grouped by period |

`cumulated_traffic` object:

| Field | Type | Description |
|-------|------|-------------|
| `requests_used_last_days` | number | API calls in last 7 days |
| `total_requests_per_time_period` | number | Aggregate requests for date range |
| `total_traffic_per_time_period` | number | Total bytes for date range |
| `traffic` | array | `[{date, api_requests, total_bytes}]` items |

---

## GET /v1/orgs/me/statistics/:assets_traffic

Retrieve asset bandwidth statistics.

**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `start_date` | string | `YYYY-MM-DD` |
| `end_date` | string | `YYYY-MM-DD` |

**Response:** `{ "assets": [ /* Asset Objects with total_bytes */ ] }`

Asset object fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Asset ID |
| `alt` | string | Alt text |
| `asset_folder_id` | number | Folder ID |
| `content_length` | number | File size in bytes |
| `content_type` | string | MIME type |
| `deleted_at` | string\|null | Removal timestamp or null |
| `filename` | string | Full path/filename |
| `is_private` | boolean | Access restriction flag |
| `space_id` | number | Space ID |
| `total_bytes` | number | Bandwidth consumed in bytes for period |

---

## GET /v1/spaces/:space_id/statistics/:date

Per-space daily stats for a given month. `:date` is `YYYY-MM-DD` — returns stats for the entire month.

**Response:**
```json
{
  "statistics": [
    {
      "id": 155721213373372,
      "counting": 11,
      "total_bytes": 275000,
      "created_at": "2026-03-16"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Record ID |
| `counting` | number | Number of API requests on that day |
| `total_bytes` | number\|null | Bandwidth in bytes; null if not calculated |
| `created_at` | string | Day of the logged usage |
