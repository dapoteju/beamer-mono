import { PlayerConfig, Playlist, PlaybackEvent, HeartbeatEvent } from "./types";
import { RawBeamerConfig } from "./storage";

let BASE_URL = "";

function ensureBaseUrl() {
  if (!BASE_URL) {
    throw new Error("Beamer API BASE_URL is not set. loadBeamerConfig() or setApiBaseUrl() did not run.");
  }
}

export function setApiBaseUrl(url: string) {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid api_base_url. Check beamer.config.json.api_base_url");
  }

  const normalized = url.replace(/\/+$/, "");
  BASE_URL = `${normalized}/player`;
  console.log("Beamer API base URL set to:", BASE_URL);
}

function authHeader(auth_token: string) {
  return {
    Authorization: `Bearer ${auth_token}`,
  };
}

export class PlayerAlreadyRegisteredError extends Error {
  public readonly code = "PLAYER_ALREADY_REGISTERED";
  public readonly existingPlayerId: string;

  constructor(message: string, existingPlayerId: string) {
    super(message);
    this.name = "PlayerAlreadyRegisteredError";
    this.existingPlayerId = existingPlayerId;
  }
}

export async function registerPlayer(beamerConfig: RawBeamerConfig): Promise<PlayerConfig> {
  ensureBaseUrl();

  const { serial_number, screen_id, provisioning_code } = beamerConfig;

  const body: Record<string, string> = {
    serial_number,
    screen_id,
  };

  if (provisioning_code) {
    body.provisioning_code = provisioning_code;
  }

  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (json.status !== "success") {
    console.error("Request failed. BASE_URL:", BASE_URL, "HTTP:", res.status, "response:", json);
    
    if (json.code === "PLAYER_ALREADY_REGISTERED") {
      const existingPlayerId = json.data?.existing_player_id || "unknown";
      console.error(
        `\n========================================\n` +
        `Registration failed: screen already linked to player ${existingPlayerId}.\n` +
        `Action required: Go to CMS → Screen → "Disconnect Player"\n` +
        `========================================\n`
      );
      throw new PlayerAlreadyRegisteredError(
        "Screen already linked to another player. Please disconnect the player from the Beamer CMS to continue.",
        existingPlayerId
      );
    }

    if (json.code === "SCREEN_NOT_FOUND") {
      throw new Error("Screen not found. Check your beamer.config.json screen_id.");
    }

    throw new Error(json.message || `Failed to register player (HTTP ${res.status})`);
  }

  const data = json.data;

  const combinedToken = `${data.player_id}:${data.auth_token}`;

  const config: PlayerConfig = {
    player_id: data.player_id,
    auth_token: combinedToken,
    screen_id: data.screen_id,
    software_version: "1.0.0",
  };

  return config;
}

export async function fetchPlaylist(
  auth_token: string,
  config_hash?: string
): Promise<Playlist | null> {
  ensureBaseUrl();

  const url = config_hash
    ? `${BASE_URL}/playlist?config_hash=${config_hash}`
    : `${BASE_URL}/playlist`;

  try {
    const res = await fetch(url, {
      headers: {
        ...authHeader(auth_token),
      },
    });

    if (res.status === 304) {
      return null;
    }

    const json = await res.json();

    if (json.status !== "success") {
      console.error("Request failed. BASE_URL:", BASE_URL, "HTTP:", res.status, "response:", json);
      return null;
    }

    return json.data as Playlist;
  } catch (err) {
    console.error("Playlist fetch failed (probably offline). BASE_URL:", BASE_URL, "error:", err);
    return null;
  }
}


export async function sendPlaybackEvent(auth_token: string, event: PlaybackEvent) {
  ensureBaseUrl();

  console.log("Sending playback event:", event);

  try {
    const res = await fetch(`${BASE_URL}/events/playbacks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(auth_token),
      },
      body: JSON.stringify(event),
    });

    const text = await res.text();
    console.log("Playback response status:", res.status, "body:", text);

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
    }

    if (!res.ok || (json && json.status !== "success")) {
      console.error("Request failed. BASE_URL:", BASE_URL, "HTTP:", res.status, "response:", json || text);
    }
  } catch (err) {
    console.error("Playback event network error. BASE_URL:", BASE_URL, "error:", err);
  }
}


export async function sendHeartbeat(
  auth_token: string,
  hb: HeartbeatEvent
) {
  ensureBaseUrl();

  console.log("Sending heartbeat:", hb);

  try {
    const res = await fetch(`${BASE_URL}/heartbeat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(auth_token),
      },
      body: JSON.stringify(hb),
    });

    const text = await res.text();
    console.log("Heartbeat response status:", res.status, "body:", text);

    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
    }

    if (!res.ok || (json && json.status !== "success")) {
      console.error("Request failed. BASE_URL:", BASE_URL, "HTTP:", res.status, "response:", json || text);
    }
  } catch (err) {
    console.error("Heartbeat network error. BASE_URL:", BASE_URL, "error:", err);
  }
}
