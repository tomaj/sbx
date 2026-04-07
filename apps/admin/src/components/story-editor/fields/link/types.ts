import type React from 'react';
import { Image, AtSign, Link2, Globe } from 'lucide-react';

export interface LinkValue {
  linktype?: 'url' | 'story' | 'email' | 'asset';
  url?: string;
  href?: string;
  cached_url?: string;
  target?: '_blank' | '_self';
  anchor?: string;
  id?: string;
  custom_attributes?: Record<string, string>;
}

export interface StoryItem {
  id: number;
  uuid: string;
  name: string;
  full_slug: string;
  is_folder: boolean;
  published: boolean;
  unpublished_changes: boolean;
}

export interface BreadcrumbEntry {
  id: number;
  name: string;
}

export type LinkType = 'url' | 'story' | 'email' | 'asset';

export const LINK_TYPES: { type: LinkType; label: string; Icon: React.ElementType }[] = [
  { type: 'asset', label: 'Asset', Icon: Image },
  { type: 'email', label: 'Email', Icon: AtSign },
  { type: 'story', label: 'Internal link', Icon: Link2 },
  { type: 'url', label: 'URL', Icon: Globe },
];
