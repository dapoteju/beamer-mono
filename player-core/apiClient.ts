import { PlayerConfig, Playlist, PlaybackEvent, HeartbeatEvent } from "./types";
import { RawBeamerConfig } from "./storage";

let BASE_URL = "https://beamer-api.replit.app/api/player";

export function setApiBaseUrl(url: string) {
  BASE_URL = url.replace(/\/+$/, "") + "/player";
}

function authHeader(auth_token: string) {
  return {
    Authorization: `Bearer ${auth_token}`,
  };
}

export async function registerPlayer(beamerConfig: RawBeamerConfig): Promise<PlayerConfig> {
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
    console.error("Failed to register player. HTTP status:", res.status, "response:", json);
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
      console.error("Failed to fetch playlist:", json);
      return null;
    }

    return json.data as Playlist;
  } catch (err) {
    console.error("Playlist fetch failed (probably offline):", err);
    return null;
  }
}


export async function sendPlaybackEvent(auth_token: string, event: PlaybackEvent) {
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
      console.error("Playback event error:", json || text);
    }
  } catch (err) {
    console.error("Playback event network error:", err);
  }
}


export async function sendHeartbeat(
  auth_token: string,
  hb: HeartbeatEvent
) {
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
      console.error("Heartbeat error:", json || text);
    }
  } catch (err) {
    console.error("Heartbeat network error:", err);
  }
}
