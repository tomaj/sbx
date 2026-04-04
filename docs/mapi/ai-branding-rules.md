# AI Branding Rules — Storyblok Management API

Verified against production Storyblok API (space 285923).

---

## The AI Branding Rule Object

| Field | Type | Description |
|-------|------|-------------|
| `industry_niche` | string\|null | Sector/industry to adapt tone and language |
| `brand_product_service` | string\|null | Brief description of the business/product (max 1000) |
| `target_audience` | string\|null | Who the content is for (max 200) |
| `tone_guidelines` | string\|null | Tone of the content (max 200) |
| `writing_style` | string\|null | Writing style guidelines (max 200) |
| `values_or_personality_traits` | string\|null | Brand values and personality (max 200) |
| `formatting` | string\|null | Output style rules (max 200) |
| `always_use` | string\|null | Terms/styles to always use (max 200) |
| `commonly_use` | string\|null | Terms/styles to use frequently (max 200) |
| `avoid_use` | string\|null | Terms/styles to minimize (max 200) |
| `never_use` | string\|null | Terms/styles to completely avoid (max 200) |
| `additional_guidelines` | string\|null | Extra context in markdown (max 1000) |

---

## GET /v1/spaces/:space_id/ai_branding_rules

Returns the branding rules for the space.

**Response:**
```json
{
  "ai_branding_rule": {
    "industry_niche": "Telecommunications provider in Slovakia.",
    "brand_product_service": "Telekom.sk - Slovak Telekom, a.s.",
    "target_audience": "Slovak-speaking customers in Slovakia.",
    "tone_guidelines": "Profesionálny, zrozumiteľný, priateľský.",
    "writing_style": "Jasný a stručný.",
    "values_or_personality_traits": "Innovative, trustworthy, customer-first.",
    "formatting": "Alt text pre obrázky vždy generuj v slovenčine.",
    "always_use": null,
    "commonly_use": "Slovenský jazyk, slovenské výrazy",
    "avoid_use": "English language in alt text",
    "never_use": "English alt text for images",
    "additional_guidelines": "# Jazyk pre AI generovaný obsah\n..."
  }
}
```

---

## PUT /v1/spaces/:space_id/ai_branding_rules

Update branding rules for the space.

**Request body:**
```json
{
  "ai_branding_rule": {
    "industry_niche": "...",
    "brand_product_service": "...",
    "target_audience": "...",
    "tone_guidelines": "...",
    "writing_style": "...",
    "values_or_personality_traits": "...",
    "formatting": "...",
    "always_use": null,
    "commonly_use": "...",
    "avoid_use": "...",
    "never_use": "...",
    "additional_guidelines": "..."
  }
}
```

**Response:** `{ "ai_branding_rule": { /* updated object */ } }`

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/spaces/:space_id/ai_branding_rules` | Get branding rules |
| PUT | `/v1/spaces/:space_id/ai_branding_rules` | Update branding rules |
