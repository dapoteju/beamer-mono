const path = require("path") as typeof import("path");
const fs = require("fs") as typeof import("fs");

function isNodeEnv(): boolean {
  try {
    if (typeof process !== "undefined" && process.versions && process.versions.electron) {
      return true;
    }
    if (typeof window === "undefined") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let _dataDir: string | null = null;

export function getDataDir(): string {
  if (!isNodeEnv()) {
    return "";
  }

  if (_dataDir) {
    return _dataDir;
  }

  const candidatePaths = [
    process.cwd(),
    path.join(__dirname, ".."),
    __dirname,
  ];

  for (const candidate of candidatePaths) {
    const configPath = path.join(candidate, "beamer.config.json");
    if (fs.existsSync(configPath)) {
      _dataDir = candidate;
      console.log("Resolved data directory (where beamer.config.json lives):", _dataDir);
      return _dataDir;
    }
  }

  _dataDir = process.cwd();
  console.log("Falling back to CWD as data directory:", _dataDir);
  return _dataDir;
}

export function getPlaylistFilePath(): string {
  if (!isNodeEnv()) {
    return "playlist.json";
  }
  return path.join(getDataDir(), "playlist.json");
}

export function getPlayerConfigFilePath(): string {
  if (!isNodeEnv()) {
    return "player.json";
  }
  return path.join(getDataDir(), "player.json");
}

export function getBeamerConfigFilePath(): string {
  if (!isNodeEnv()) {
    return "beamer.config.json";
  }
  return path.join(getDataDir(), "beamer.config.json");
}

export function getCacheDir(): string {
  if (!isNodeEnv()) {
    return "cache";
  }
  const cacheDir = path.join(getDataDir(), "cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

export function resolveDataPath(filename: string): string {
  if (!isNodeEnv()) {
    return filename;
  }
  return path.join(getDataDir(), filename);
}
