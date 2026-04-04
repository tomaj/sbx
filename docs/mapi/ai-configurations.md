# AI Configurations — Storyblok Management API

Verified against production Storyblok API (space 285923).

---

## The AI Configuration Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Numeric ID |
| `name` | string | Display name (e.g. "OpenAI - Storyblok Default") |
| `description` | string\|null | Optional description |
| `provider_name` | string | Provider identifier: `"openai"` |
| `model_identifier` | string | Model name, e.g. `"gpt-4o"` |
| `settings` | object | Additional provider-specific settings |
| `source` | string | `"storyblok_default"` or `"custom"` |
| `custom` | boolean | `false` for Storyblok default, `true` for custom |

> **Note:** `api_key` and AWS credentials are write-only — never returned in responses.

---

## GET /v1/ai_configurations?space_id=:id

Returns AI configurations available for the space.

**Response:**
```json
{
  "ai_configurations": [
    {
      "id": 115913464365359,
      "name": "OpenAI - Storyblok Default",
      "description": null,
      "provider_name": "openai",
      "model_identifier": "gpt-4o",
      "settings": {},
      "source": "storyblok_default",
      "custom": false
    }
  ],
  "meta": {
    "default_ai_configuration_id": 115913464365359,
    "org_default_ai_configuration_id": 115913464365359
  }
}
```

---

## GET /v1/ai_configurations/:id?space_id=:id

Returns a single AI configuration.

**Response:** `{ "ai_configuration": { /* object */ } }`

---

## POST /v1/ai_configurations

Create a custom AI configuration.

**Request body:**
```json
{
  "ai_configuration": {
    "name": "Custom OpenAI",
    "description": null,
    "provider_name": "openai",
    "model_identifier": "gpt-4o",
    "api_key": "sk-...",
    "settings": {}
  },
  "space_id": 285923
}
```

**Response:** `{ "ai_configuration": { /* created object */ } }`

---

## PUT /v1/ai_configurations/:id

Update a custom AI configuration.

Same body as POST (without `space_id`). Use `?space_id=:id` query param.

**Response:** `{ "ai_configuration": { /* updated object */ } }`

---

## DELETE /v1/ai_configurations/:id?space_id=:id

Delete a custom AI configuration.

**Response:** HTTP 204 No Content

---

## GET /v1/ai_configurations/providers?space_id=:id

Returns available providers and their models, split into `default` (Storyblok-managed) and `custom` (user-managed).

**Response:**
```json
{
  "default": {
    "openai": {
      "models": [
        { "label": "GPT-4o", "value": "gpt-4o", "caption": "Fastest GPT-4 model with multimodal support and high-quality reasoning (128k context)" },
        { "label": "GPT-5", "value": "gpt-5", "caption": "..." }
      ]
    }
  },
  "custom": {
    "openai": {
      "models": [
        { "label": "GPT-5.1", "value": "gpt-5.1", "caption": "..." },
        { "label": "GPT-4o", "value": "gpt-4o", "caption": "..." },
        { "label": "GPT-4", "value": "gpt-4", "caption": "High-quality reasoning, long context (128k)" },
        { "label": "GPT-4 Turbo", "value": "gpt-4-turbo", "caption": "Cheaper and faster GPT-4 variant (128k context)" },
        { "label": "GPT-3.5 Turbo", "value": "gpt-3.5-turbo", "caption": "Fast and cost-effective (16k context)" }
      ]
    }
  }
}
```

---

## SBX Extensions

SBX extends the standard `provider_name` values to also support:

| `provider_name` | Description |
|----------------|-------------|
| `openai` | OpenAI direct |
| `anthropic` | Anthropic direct |
| `anthropic_bedrock` | Anthropic via AWS Bedrock |
| `gemini` | Google Gemini |

For `anthropic_bedrock`, additional fields in `settings`:
```json
{
  "settings": {
    "aws_region": "us-east-1",
    "aws_access_key_id": "AKIA...",
    "aws_secret_access_key": "..."
  }
}
```

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/ai_configurations?space_id=:id` | List configurations for space |
| GET | `/v1/ai_configurations/:id?space_id=:id` | Get single configuration |
| POST | `/v1/ai_configurations` | Create custom configuration |
| PUT | `/v1/ai_configurations/:id` | Update custom configuration |
| DELETE | `/v1/ai_configurations/:id?space_id=:id` | Delete custom configuration |
| GET | `/v1/ai_configurations/providers?space_id=:id` | List available providers + models |
