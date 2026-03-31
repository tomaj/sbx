# Extensions (Apps) — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/extensions

Extensions encompass Space Apps, Tool Plugins, and Field Plugins. The API uses `app` as the legacy key in responses.

---

## The Extension Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Extension name |
| `slug` | string | Unique slug |
| `icon` | string | Icon image path |
| `plan_level` | number | Required plan level |
| `preview_video` | string | Preview video URL |
| `app_url` | string | Extension URL |
| `description` | string | Full description |
| `intro` | string | Short description |
| `screenshot` | string | Screenshot image path |
| `status` | string | Extension status |
| `website` | string | Website URL |
| `author` | string | Author name |
| `updated_at` | string | ISO 8601 |
| `field_type_ids` | number[] | Associated field type IDs |
| `embedded_app_url` | string | Space app or Tool Plugin iframe URL |
| `dev_embedded_app_url` | string | Dev mode iframe URL |
| `dev_oauth_redirect_uri` | string | Dev mode OAuth redirect URI |
| `in_sidebar` | boolean | Shown in sidebar |
| `in_toolbar` | boolean | Shown in toolbar |
| `sidebar_icon` | string | Sidebar icon image path |
| `oauth_redirect_uri` | string | OAuth redirect URI |
| `enable_space_settings` | boolean | Supports space-level settings |

---

## The App Provision Object

| Field | Type | Description |
|-------|------|-------------|
| `public_config` | string | Public configuration |
| `session` | string | Session status |
| `slug` | string | Plugin slug |
| `extension_id` | number | Extension ID |
| `name` | string | Plugin name |
| `in_sidebar` | boolean | Sidebar status |
| `in_toolbar` | boolean | Toolbar status |
| `sidebar_icon` | string | Sidebar icon |
| `enable_space_settings` | boolean | Space settings enabled |
| `space_level_settings` | object | Space-specific settings (non-sensitive only) |

---

## Extension CRUD

### GET /v1/org_apps

List org extensions. **Response:** `{ "apps": [ /* Extension Objects */ ] }`

### GET /v1/partner_apps

List partner extensions. **Response:** `{ "apps": [ /* Extension Objects */ ] }`

### GET /v1/apps/:extension_id

**Response:** `{ "app": { /* Extension Object */ } }`

### POST /v1/org_apps

Create an extension. **Request body** (root-level fields, NOT wrapped):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Extension name |
| `slug` | string | Yes | Unique slug |
| `embedded_app_url` | string | No | Space app or Tool Plugin URL |
| `dev_embedded_app_url` | string | No | Dev mode URL |
| `dev_oauth_redirect_uri` | string | No | Dev OAuth redirect URI |
| `oauth_redirect_uri` | string | No | OAuth redirect URI |
| `field_type_ids` | number[] | No | Associated field type IDs |
| `in_sidebar` | boolean | No | Show in sidebar |
| `in_toolbar` | boolean | No | Show in toolbar |
| `enable_space_settings` | boolean | No | Enable space-level settings |
| `description` | string | No | Full description |
| `intro` | string | No | Short description |
| `icon` | string | No | Icon image path |
| `screenshot` | string | No | Screenshot path |
| `website` | string | No | Website URL |
| `author` | string | No | Author name |

### PUT /v1/org_apps/:extension_id

Same fields as POST (all optional).

### DELETE /v1/org_apps/:extension_id

**Response:** Standard empty/confirmation response.

### DELETE /v1/partner_apps/:extension_id

Same as org app delete.

---

## App Provisions (Installed Extensions per Space)

### GET /v1/spaces/:space_id/app_provisions

List all installed extensions in a space. **Response:** `{ "app_provisions": [ /* App Provision Objects */ ] }`

### GET /v1/spaces/:space_id/app_provisions/:extension_id

**Response:** `{ "app": { /* Extension Object */ }, "app_provision": { /* App Provision Object */ } }`

### PUT /v1/spaces/:space_id/app_provisions/:app_id

Update installed extension space settings.

**Request body:**
```json
{
  "app_provision": {
    "space_level_settings": {
      "my_setting": "value"
    }
  }
}
```

**Note:** Requires `enable_space_settings: true` on the parent extension. Only non-sensitive data.
