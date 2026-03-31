# Branch Deployments — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/branch-deployments

**Note:** Requires the Pipelines app to be installed in the space.

Only **one endpoint** exists (POST create). There is no GET/PUT/DELETE for deployments.

---

## POST /v1/spaces/:space_id/deployments

Trigger a deployment for a branch. Stories start in the default branch and are released to other branches (Staging, Production, etc.) by creating a branch deployment.

**Request body** (NOT wrapped in a key — sent as root object):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branch_id` | number | Yes | The branch ID to deploy |
| `release_uuids` | string[] | No | Release UUIDs to include in the deployment |

```bash
curl "https://mapi.storyblok.com/v1/spaces/12345/deployments/" \
  -X POST \
  -H "Authorization: YOUR_OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branch_id":1,"release_uuids":["1234-4567","1234-4568"]}'
```

**Response:** Not documented by Storyblok.
