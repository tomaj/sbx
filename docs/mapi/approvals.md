# Approvals — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/approvals

---

## The Approval Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric unique ID of the approval |
| `status` | string | Status: `"pending"` |
| `story_id` | number | ID of the content entry to be approved |
| `approver_id` | number | ID of the user who should approve |

```json
{
  "approval": {
    "id": 11,
    "status": "pending",
    "story_id": 1066,
    "approver_id": 1028
  }
}
```

---

## GET /v1/spaces/:space_id/approvals

**Query params:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `approver` | number | Filter by approver user ID |

**Response:** `{ "approvals": [ /* Approval Objects */ ] }` (paginated)

---

## GET /v1/spaces/:space_id/approvals/:approver_id

**Response:** `{ "approval": { /* Approval Object */ } }`

---

## POST /v1/spaces/:space_id/approvals

Create a story approval or a release approval.

**Request body:**
```json
{
  "approval": {
    "approver_id": 1028,
    "story_id": 1066
  }
}
```

For release approval, add `release_id` at root level:
```json
{
  "approval": {
    "approver_id": 1030,
    "story_id": 1067
  },
  "release_id": 16
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approval.approver_id` | number | Yes | User who should approve |
| `approval.story_id` | number | Yes | Story requiring approval |
| `release_id` | number | No | Include to create release approval |

**Response:** `{ "approval": { "id": 11, "status": "pending" } }`

---

## DELETE /v1/spaces/:space_id/approvals/:approval_id

**Response:** HTTP 204 No Content
