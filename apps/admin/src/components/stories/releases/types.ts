export type Release = {
  id: number;
  name: string;
  uuid: string;
  release_at: string | null;
  released: boolean;
  created_at: string;
};

export interface ReleaseSwitcherProps {
  spaceId: string;
  activeReleaseId: number | null;
  onActiveReleaseChange: (id: number | null) => void;
  showReleaseContentOnly: boolean;
  onShowReleaseContentOnlyChange: (value: boolean) => void;
  onReleasesChange?: (releases: Release[]) => void;
}
