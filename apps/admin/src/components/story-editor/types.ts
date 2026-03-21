export interface ComponentMeta {
  name: string
  display_name: string | null
  schema: Record<string, any>
}

export interface StoryDetail {
  id: number
  uuid: string
  name: string
  slug: string
  full_slug: string
  path: string | null
  parent_id: number | null
  content_type: string | null
  is_folder: boolean
  is_startpage: boolean
  published: boolean
  unpublished_changes: boolean
  position: number
  created_at: string
  updated_at: string
  published_at: string | null
  first_published_at: string | null
  last_author_id: number | null
  // content fields
  content: Record<string, any>
  tag_list: string[]
  sort_by_date: string | null
  publish_at: string | null
  expire_at: string | null
}
