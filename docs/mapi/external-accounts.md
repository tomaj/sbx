# External Accounts — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/external-accounts

**Note:** Only GitHub integration is documented. Other external account types are not present in the docs.

---

## GET /v1/auth/github/me

Retrieve the connected GitHub account for the current user.

**Auth:** `Authorization: YOUR_OAUTH_TOKEN`

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `github_email` | string | Email of the connected GitHub account |
| `has_password` | boolean | Whether the user has set a password on their Storyblok account |
