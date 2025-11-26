// Simple storage wrapper that works in Node (Electron) and browser sim.

export interface RawBeamerConfig {
  api_base_url: string;
  serial_number: string;
  screen_id: string;
  provisioning_code?: string;
}

function canUseFileSystem(): boolean {
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

export function saveJSON(path: string, data: any) {
  if (canUseFileSystem()) {
    const fs = require("fs");
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } else {
    localStorage.setItem(path, JSON.stringify(data));
  }
}

export function loadJSON(path: string): any | null {
  if (canUseFileSystem()) {
    const fs = require("fs");
    if (!fs.existsSync(path)) return null;
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } else {
    const raw = localStorage.getItem(path);
    return raw ? JSON.parse(raw) : null;
  }
}

export function loadBeamerConfig(): RawBeamerConfig {
  let config: RawBeamerConfig | null = null;
  let resolvedPath: string | null = null;

  if (canUseFileSystem()) {
    const fs = require("fs");
    const path = require("path");

    const candidatePaths = [
      path.join(process.cwd(), "beamer.config.json"),
      path.join(__dirname, "beamer.config.json"),
      path.join(__dirname, "..", "beamer.config.json"),
    ];

    for (const candidatePath of candidatePaths) {
      if (fs.existsSync(candidatePath)) {
        resolvedPath = candidatePath;
        try {
          config = JSON.parse(fs.readFileSync(candidatePath, "utf-8"));
        } catch (err) {
          throw new Error(`Failed to parse beamer.config.json at ${candidatePath}: ${err}`);
        }
        break;
      }
    }

    if (resolvedPath && config) {
      console.log("Loaded beamer.config.json from:", resolvedPath, config);
    }
  } else {
    config = loadJSON("beamer.config.json") as RawBeamerConfig | null;
    if (config) {
      console.log("Loaded beamer.config.json from localStorage:", config);
    }
  }

  if (!config) {
    throw new Error(
      "Missing beamer.config.json. Please create it in the working directory with api_base_url, serial_number, and screen_id."
    );
  }

  if (!config.api_base_url || !config.serial_number || !config.screen_id) {
    throw new Error(
      "Invalid beamer.config.json. Must include api_base_url, serial_number, and screen_id."
    );
  }

  return config;
}

function isNodeEnv() {
  return canUseFileSystem();
}

export function loadEventQueue<T = any>(filename: string): T[] {
  if (!isNodeEnv()) {
    const raw = localStorage.getItem(filename);
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      console.warn(`Corrupted queue file in localStorage: ${filename}, resetting to empty`);
      return [];
    }
  }
  try {
    const data = loadJSON(filename);
    if (!data || !Array.isArray(data)) return [];
    return data as T[];
  } catch (err) {
    console.warn(`Corrupted queue file: ${filename}, resetting to empty`, err);
    return [];
  }
}

export function saveEventQueue<T = any>(filename: string, events: T[]): void {
  if (!isNodeEnv()) {
    localStorage.setItem(filename, JSON.stringify(events));
    return;
  }
  saveJSON(filename, events);
}
