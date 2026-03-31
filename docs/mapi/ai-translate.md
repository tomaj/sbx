# AI Translate — Storyblok Management API

Source: https://www.storyblok.com/docs/api/management/ai-translate

---

## GET /v1/ai_languages

Retrieve supported AI translation languages.

**Response:**
```json
{
  "response": {
    "en": "English",
    "es": "Spanish",
    "de": "German",
    "fr": "French",
    "..."  : "..."
  }
}
```

Supported languages (31 total): English, Spanish, French, German, Italian, Dutch, Portuguese, Russian, Japanese, Korean, Chinese, Polish, Romanian, Swedish, Finnish, Norwegian, Czech, Bulgarian, Hungarian, Danish, Slovenian, Turkish, Thai, Vietnamese, Bahasa (Indonesian), Catalan, Bengali, Ukrainian, Tagalog (Filipino), Nepali, Malay, Kazakh, Arabic.

---

## PUT /v1/spaces/:space_id/stories/:story_id/ai_translate

Translate a story's content using AI. **Does NOT persist the translation** — you must call PUT story separately to save.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lang` | string | No | Official language code (e.g. `en`, `de`, `fr`) |
| `code` | string | No | Custom language identifier from Space Settings > Internationalization |
| `overwrite` | boolean | No | Whether translated value replaces existing value for the language |
| `release_id` | number | No | Release ID of the story |

**Response:** A single story object with translated fields in the `content` property. Changes are preview-only — must be saved separately via PUT story.
