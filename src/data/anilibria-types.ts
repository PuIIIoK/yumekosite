// ── Value/Description pair (used throughout the API) ──
export interface ValueDescription {
  value: string;
  description: string;
}

// ── Images ──
export interface OptimizedImage {
  src: string;
  preview: string;
  thumbnail: string;
}

export interface PosterImage {
  src: string;
  preview: string;
  thumbnail: string;
  optimized: OptimizedImage;
}

export interface GenreImage {
  preview: string;
  thumbnail: string;
  optimized: {
    preview: string;
    thumbnail: string;
  };
}

export interface EpisodePreviewImage {
  src: string;
  preview: string;
  thumbnail: string;
  optimized: OptimizedImage;
}

// ── Name ──
export interface ReleaseName {
  main: string;
  english: string;
  alternative: string | null;
}

// ── Season ──
export interface ReleaseSeason {
  value: "winter" | "spring" | "summer" | "fall";
  description: string;
}

// ── Age Rating ──
export interface AgeRating {
  value: string;
  label: string;
  is_adult: boolean;
  description: string;
}

// ── Publish Day ──
export interface PublishDay {
  value: number;
  description: string;
}

// ── Genre ──
export interface Genre {
  id: number;
  name: string;
  image: GenreImage;
  total_releases: number;
}

// ── Member ──
export interface Member {
  id: string;
  role: ValueDescription;
  nickname: string;
  user: unknown | null;
}

// ── Sponsor ──
export interface Sponsor {
  id: string;
  title: string;
  description: string;
  url_title: string;
  url: string;
}

// ── Episode ──
export interface EpisodeTimestamp {
  start: number | null;
  stop: number | null;
}

export interface Episode {
  id: string;
  name: string | null;
  ordinal: number;
  opening: EpisodeTimestamp;
  ending: EpisodeTimestamp;
  preview: EpisodePreviewImage;
  hls_480: string;
  hls_720: string;
  hls_1080: string;
  duration: number;
  rutube_id: string | null;
  youtube_id: string | null;
  updated_at: string;
  sort_order: number;
  release_id: number;
  name_english: string | null;
}

// ── Torrent Codec ──
export interface TorrentCodec {
  value: string;
  label: string;
  description: string;
  label_color: string | null;
  label_is_visible: boolean;
}

// ── Torrent ──
export interface Torrent {
  id: number;
  hash: string;
  size: number;
  type: ValueDescription;
  label: string;
  codec: TorrentCodec;
  color: ValueDescription;
  magnet: string;
  seeders: number;
  quality: ValueDescription;
  bitrate: number | null;
  filename: string;
  leechers: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_hardsub: boolean;
  description: string;
  completed_times: number;
  release: ReleaseBase;
}

// ── Release (base — without nested arrays, used inside Torrent) ──
export interface ReleaseBase {
  id: number;
  type: ValueDescription;
  year: number;
  name: ReleaseName;
  alias: string;
  season: ReleaseSeason;
  poster: PosterImage;
  fresh_at: string;
  created_at: string;
  updated_at: string;
  is_ongoing: boolean;
  age_rating: AgeRating;
  publish_day: PublishDay;
  description: string;
  notification: string | null;
  episodes_total: number;
  external_player: string | null;
  is_in_production: boolean;
  is_blocked_by_geo: boolean;
  is_blocked_by_copyrights: boolean;
  added_in_users_favorites: number;
  average_duration_of_episode: number;
  added_in_planned_collection: number;
  added_in_watched_collection: number;
  added_in_watching_collection: number;
  added_in_postponed_collection: number;
  added_in_abandoned_collection: number;
}

// ── Full Release (top-level API response) ──
export interface Release extends ReleaseBase {
  genres: Genre[];
  members: Member[];
  sponsors: Sponsor[];
  episodes: Episode[];
  torrents: Torrent[];
}
