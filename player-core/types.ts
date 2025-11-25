export interface Location {
  lat: number;
  lng: number;
  accuracy_m?: number;
  timestamp?: string;
}

export interface DeviceMetrics {
  cpu_usage: number;
  memory_free_mb: number;
  storage_free_mb: number;
  network_type: string;
  online: boolean;
}

export interface Creative {
  creative_id: string;
  type: "image" | "video";
  file_url: string;
  duration_seconds: number;
  local_file_path?: string;
}

export interface Playlist {
  screen_id: string;
  region: string;
  city: string;
  config_hash: string;
  playlist: Creative[];
}

export interface PlayerConfig {
  player_id: string;
  auth_token: string;
  screen_id: string;
  software_version?: string;
}

export interface PlaybackEvent {
  creative_id: string;
  screen_id: string;
  played_at: string;
  duration_seconds: number;
  status: "success" | "error" | "skipped";
  location?: Location;
}

export interface HeartbeatEvent {
  player_id: string;
  screen_id: string;
  timestamp: string;
  status: string;
  software_version: string;
  location?: Location;
  metrics?: DeviceMetrics;
}
