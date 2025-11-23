import { loadJSON, saveJSON } from "./storage";
import { Playlist, Creative } from "./types";
import { fetchPlaylist } from "./apiClient";

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

  // 🔹 DEV ONLY: if playlist is empty, inject a dummy creative for testing
  if (!Array.isArray(playlist.playlist) || playlist.playlist.length === 0) {
    console.warn("Remote playlist is empty. Injecting a dummy test creative (DEV ONLY).");

    const dummy: Creative = {
      creative_id: "dummy_1",
      type: "image",
      file_url: "https://via.placeholder.com/320x108.png?text=Beamer+Test+Ad",
      duration_seconds: 10,
    };

    playlist = {
      ...playlist,
      playlist: [dummy],
    };
  }

  // Save to disk
  saveJSON("playlist.json", playlist);
  return playlist;
}
