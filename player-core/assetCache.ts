import { Creative, Playlist } from "./types";

function isNodeEnv() {
  return typeof window === "undefined";
}

function getFsAndPath() {
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
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const lastSegment = pathname.split("/").pop() || "";
    const extMatch = lastSegment.match(/\.(\w+)$/);
    return extMatch ? extMatch[0] : "";
  } catch {
    return "";
  }
}

export function isAssetValid(localPath: string | undefined | null): boolean {
  if (!localPath) return false;
  if (!isNodeEnv()) return true;

  try {
    const { fs } = getFsAndPath();
    const stat = fs.statSync(localPath);
    if (!stat.isFile()) return false;
    if (stat.size <= 0) return false;
    return true;
  } catch (err) {
    return false;
  }
}

async function downloadCreative(creative: Creative): Promise<Creative> {
  if (!isNodeEnv()) {
    return creative;
  }

  const { fs, path } = getFsAndPath();

  const cacheDir = getCacheDir();
  const ext = getExtensionFromUrl(creative.file_url) || ".bin";
  const filename = `${creative.creative_id}${ext}`;
  const cachePath = path.join(cacheDir, filename);

  try {
    const res = await fetch(creative.file_url);
    if (!res.ok) {
      console.error("Failed to download creative:", creative.file_url, res.status);
      return creative;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(cachePath, buffer);

    return { ...creative, local_file_path: cachePath };
  } catch (err) {
    console.error("Error downloading creative:", creative.file_url, err);
    return creative;
  }
}

async function cacheCreative(creative: Creative): Promise<Creative> {
  if (!isNodeEnv()) {
    return creative;
  }

  const { fs, path } = getFsAndPath();

  const cacheDir = getCacheDir();
  const ext = getExtensionFromUrl(creative.file_url) || ".bin";
  const filename = `${creative.creative_id}${ext}`;
  const cachePath = path.join(cacheDir, filename);

  if (fs.existsSync(cachePath) && isAssetValid(cachePath)) {
    return { ...creative, local_file_path: cachePath };
  }

  return downloadCreative(creative);
}

export async function cachePlaylistAssets(playlist: Playlist): Promise<Playlist> {
  if (!isNodeEnv()) {
    return playlist;
  }

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

export async function verifyAndRepairAssets(playlist: Playlist): Promise<Playlist> {
  if (!isNodeEnv()) {
    return playlist;
  }

  const creatives = playlist.playlist || [];
  const repairedCreatives: Creative[] = [];

  for (const creative of creatives) {
    if (isAssetValid(creative.local_file_path)) {
      repairedCreatives.push(creative);
      continue;
    }

    console.warn(
      `Asset invalid or missing for creative ${creative.creative_id}, attempting re-download...`
    );

    try {
      const repaired = await downloadCreative(creative);
      if (isAssetValid(repaired.local_file_path)) {
        console.log(`Successfully repaired asset for creative ${creative.creative_id}`);
        repairedCreatives.push(repaired);
      } else {
        console.error(`Failed to repair asset for creative ${creative.creative_id}`);
        repairedCreatives.push(creative);
      }
    } catch (err) {
      console.error(
        `Failed to re-download asset for creative ${creative.creative_id}:`,
        err
      );
      repairedCreatives.push(creative);
    }
  }

  return {
    ...playlist,
    playlist: repairedCreatives,
  };
}
