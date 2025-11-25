// Simple storage wrapper that works in Node (Electron) and browser sim.

export interface RawBeamerConfig {
  api_base_url: string;
  serial_number: string;
  screen_id: string;
  provisioning_code?: string;
}

export function saveJSON(path: string, data: any) {
  if (typeof window === "undefined") {
    // Running in Node (Electron)
    const fs = require("fs");
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  } else {
    // Running in browser sim
    localStorage.setItem(path, JSON.stringify(data));
  }
}

export function loadJSON(path: string): any | null {
  if (typeof window === "undefined") {
    const fs = require("fs");
    if (!fs.existsSync(path)) return null;
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } else {
    const raw = localStorage.getItem(path);
    return raw ? JSON.parse(raw) : null;
  }
}

export function loadBeamerConfig(): RawBeamerConfig {
  const config = loadJSON("beamer.config.json") as RawBeamerConfig | null;

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
