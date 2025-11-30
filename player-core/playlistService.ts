import { loadJSON, saveJSON } from "./storage";
import { Playlist, Creative } from "./types";
import { fetchPlaylist } from "./apiClient";
import { cachePlaylistAssets } from "./assetCache";
import { getPlaylistFilePath } from "./paths";

const PLAYLIST_FILENAME = "playlist.json";

const FALLBACK_CREATIVE: Creative = {
  creative_id: "fallback_placeholder",
  type: "image",
  file_url: "https://via.placeholder.com/1920x1080.png?text=No+Active+Campaigns",
  duration_seconds: 10,
};

function inferTypeFromUrl(url: string): "image" | "video" {
  const lower = (url || "").toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
    return "video";
  }
  return "image";
}

function normalizePlaylistTypes(playlist: Playlist): Playlist {
  return {
    ...playlist,
    playlist: playlist.playlist.map((creative: Creative) => {
      if (!creative.type) {
        return {
          ...creative,
          type: inferTypeFromUrl(creative.file_url),
        };
      }
      return creative;
    }),
  };
}

export async function loadLocalPlaylist(): Promise<Playlist | null> {
  return loadJSON(PLAYLIST_FILENAME);
}

export async function updatePlaylist(auth_token: string): Promise<Playlist> {
  const local: Playlist | null = loadJSON(PLAYLIST_FILENAME);
  const configHash = local?.config_hash;

  let remote: Playlist | null = null;

  try {
    remote = await fetchPlaylist(auth_token, configHash);
  } catch (err) {
    console.error("Failed to fetch remote playlist:", err);
  }

  let playlist: Playlist | null = remote || local;

  if (!playlist) {
    console.warn("No playlist available from backend or local cache. Using fallback placeholder.");
    
    playlist = {
      screen_id: "unknown",
      region: "unknown",
      city: "unknown",
      config_hash: "fallback",
      playlist: [FALLBACK_CREATIVE],
    };
  }

  if (!Array.isArray(playlist.playlist) || playlist.playlist.length === 0) {
    console.warn("Remote playlist is empty. Using fallback placeholder creative.");
    playlist = {
      ...playlist,
      playlist: [FALLBACK_CREATIVE],
    };
  }

  const normalizedPlaylist = normalizePlaylistTypes(playlist);

  const playlistWithCache = await cachePlaylistAssets(normalizedPlaylist);

  saveJSON(PLAYLIST_FILENAME, playlistWithCache);
  
  console.log("Playlist saved to:", getPlaylistFilePath());
  console.log("Playlist creatives count:", playlistWithCache.playlist.length);
  
  return playlistWithCache;
}
