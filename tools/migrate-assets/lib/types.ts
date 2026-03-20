export interface StoryblokAsset {
  id: number
  filename: string // full CDN URL e.g. https://a.storyblok.com/f/285923/path/img.jpg
  space_id: number
  content_type: string
  content_length: number
  alt: string | null
  title: string | null
  copyright: string | null
  focus: string | null
  folder_id: number | null
  locked: boolean
  updated_at: string
  created_at: string
  expire_at: string | null
  is_external_url: boolean
  meta_data: Record<string, unknown>
  short_filename: string
}

export interface AssetFolder {
  id: number
  name: string
  parent_id: number | null
  uuid: string
  created_at: string
  updated_at: string
}

export interface Manifest {
  space_id: number
  last_synced_at: string
  total_count: number
  downloaded_count: number
  // all asset IDs seen on last sync — used to detect deletions
  asset_ids: number[]
}
