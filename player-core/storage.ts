// Simple storage wrapper that works in Node (Electron) and browser sim.

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
