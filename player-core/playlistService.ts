import { loadJSON, saveJSON } from "./storage";
import { Playlist, Creative } from "./types";
import { fetchPlaylist } from "./apiClient";
import { cachePlaylistAssets } from "./assetCache";

/**
 * Infer creative type from file URL extension as a fallback
 */
function inferTypeFromUrl(url: string): "image" | "video" {
  const lower = (url || "").toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) {
    return "video";
  }
  return "image";
}

/**
 * Normalize playlist to ensure all items have a type field.
 * This is a safety net for backwards compatibility with older API responses.
 */
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
  return loadJSON("playlist.json");
}

export async function updatePlaylist(auth_token: string): Promise<Playlist> {
  const local: Playlist | null = loadJSON("playlist.json");
  const configHash = local?.config_hash;

  const remote = await fetchPlaylist(auth_token, configHash);

  // If no new playlist (304 or error), fall back to local
  let playlist: Playlist | null = remote || local;

  if (!playlist) {
    throw new Error("No playlist available (remote failed, no local cache)");
  }

  // DEV ONLY: if playlist is empty, inject a dummy creative for testing
  if (!Array.isArray(playlist.playlist) || playlist.playlist.length === 0) {
    console.warn("Remote playlist is empty. Injecting a dummy test creative (DEV ONLY).");

    const dummy: Creative = {
      creative_id: "dummy_1",
      type: "video",
      file_url:
        "https://firebasestorage.googleapis.com/v0/b/beamer-f945b.appspot.com/o/Creatives%2FAwari%20billboard%20(1).mp4?alt=media&token=8730f32a-1967-4584-823b-42dcc80b28cf",
      duration_seconds: 7,
    };

    playlist = {
      ...playlist,
      playlist: [dummy],
    };
  }

  // Normalize playlist types (safety net for older API responses)
  const normalizedPlaylist = normalizePlaylistTypes(playlist);

  // ⬇️ NEW: cache assets locally (Node/Electron only)
  const playlistWithCache = await cachePlaylistAssets(normalizedPlaylist);

  // Save to disk (includes local_file_path)
  saveJSON("playlist.json", playlistWithCache);
  return playlistWithCache;
}
