export interface Creative {
  creative_id: string;
  type: "image" | "video";
  file_url: string;
  duration_seconds: number;
}

// This matches what your API actually returns
export interface Playlist {
  screen_id: string;
  region: string;
  city: string;
  config_hash: string;
  playlist: Creative[]; // <- IMPORTANT: array is called `playlist` in the API
}

export interface PlayerConfig {
  player_id: string;
  auth_token: string;
  screen_id: string;
}

export interface PlaybackEvent {
  creative_id: string;
  played_at: string;  // ISO timestamp
  duration_seconds: number;
}

export interface HeartbeatEvent {
  player_id: string;
  status: string;
  timestamp: string;
}
