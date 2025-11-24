import { PlayerConfig, Playlist, PlaybackEvent, HeartbeatEvent } from "./types";

const BASE_URL = "https://17d379ae-de32-486e-8229-49811a28d432-00-1vcd9a1z4xejy.spock.replit.dev/api/player";//change this to your api url

// Helper: build Authorization header
function authHeader(auth_token: string) {
  return {
    Authorization: `Bearer ${auth_token}`,
  };
}

export async function registerPlayer(): Promise<PlayerConfig> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serial_number: "SIMULATED-PLAYER",
      // Use your REAL screen id here (the UUID you pasted before)
      screen_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    }),
  });

  const json = await res.json();

  if (json.status !== "success") {
    console.error("Failed to register player:", json);
    throw new Error(json.message || "Failed to register player");
  }

  const data = json.data;

  // IMPORTANT:
  // Your API expects token as "<player_id>:<auth_token>"
  const combinedToken = `${data.player_id}:${data.auth_token}`;

  const config: PlayerConfig = {
    player_id: data.player_id,
    auth_token: combinedToken,
    screen_id: data.screen_id,
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
      // No changes since last config_hash
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
    // 🔴 IMPORTANT: returning null lets updatePlaylist() fall back to local playlist
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
      // non-JSON response
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
      // ignore
    }

    if (!res.ok || (json && json.status !== "success")) {
      console.error("Heartbeat error:", json || text);
    }
  } catch (err) {
    console.error("Heartbeat network error:", err);
  }
}

