import { Creative, Playlist } from "./types";

function isNodeEnv() {
  return typeof window === "undefined";
}

function getFsAndPath() {
  // Lazy require so this file still loads in browser sim
  // but only actually uses fs/path in Node/Electron
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  return { fs, path };
}

function getCacheDir() {
  const { fs, path } = getFsAndPath();
  const cacheDir = path.join(process.cwd(), "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function getExtensionFromUrl(url: string): string {
  try {
    const { path: pathname } = new URL(url);
    const lastSegment = pathname.split("/").pop() || "";
    const extMatch = lastSegment.match(/\.(\w+)$/);
    return extMatch ? extMatch[0] : "";
  } catch {
    return "";
  }
}

async function cacheCreative(creative: Creative): Promise<Creative> {
  if (!isNodeEnv()) {
    // In browser sim, don't try to cache to disk
    return creative;
  }

  const { fs, path } = getFsAndPath();

  const cacheDir = getCacheDir();
  const ext = getExtensionFromUrl(creative.file_url) || ".bin";
  const filename = `${creative.creative_id}${ext}`;
  const cachePath = path.join(cacheDir, filename);

  // If file already exists, just return creative with local_file_path set
  if (fs.existsSync(cachePath)) {
    return { ...creative, local_file_path: cachePath };
  }

  // Otherwise, try to download and save
  try {
    const res = await fetch(creative.file_url);
    if (!res.ok) {
      console.error("Failed to download creative:", creative.file_url, res.status);
      return creative; // fallback to remote URL only
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(cachePath, buffer);

    return { ...creative, local_file_path: cachePath };
  } catch (err) {
    console.error("Error caching creative:", creative.file_url, err);
    return creative;
  }
}

export async function cachePlaylistAssets(playlist: Playlist): Promise<Playlist> {
  if (!isNodeEnv()) {
    // No disk caching in browser sim
    return playlist;
  }

  // Cache each creative sequentially (simple & safe for MVP)
  const cachedCreatives: Creative[] = [];
  for (const creative of playlist.playlist) {
    const cached = await cacheCreative(creative);
    cachedCreatives.push(cached);
  }

  return {
    ...playlist,
    playlist: cachedCreatives,
  };
}
