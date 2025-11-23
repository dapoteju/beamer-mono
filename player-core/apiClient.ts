import { PlayerConfig, Playlist, PlaybackEvent, HeartbeatEvent } from "./types";

const BASE_URL = "https://eecf164c-d39e-4080-aa4d-7c1a918a73be-00-sdkqh1jj8ea.spock.replit.dev:3000/api/player";

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

  const res = await fetch(url, {
    headers: {
      ...authHeader(auth_token),
    },
  });

  if (res.status === 304) {
    // No changes
    return null;
  }

  const json = await res.json();

  if (json.status !== "success") {
    console.error("Failed to fetch playlist:", json);
    return null;
  }

  // Assuming json.data is shaped like Playlist
  return json.data as Playlist;
}

export async function sendPlaybackEvent(auth_token: string, event: PlaybackEvent) {
  const res = await fetch(`${BASE_URL}/events/playbacks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(auth_token),
    },
    body: JSON.stringify(event),
  });

  // Optional: you can inspect the response if needed
  try {
    const json = await res.json();
    if (json.status !== "success") {
      console.error("Playback event error:", json);
    }
  } catch {
    // ignore body parse issues for now
  }
}

export async function sendHeartbeat(
  auth_token: string,
  hb: HeartbeatEvent
) {
  const res = await fetch(`${BASE_URL}/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(auth_token),
    },
    body: JSON.stringify(hb),
  });

  try {
    const json = await res.json();
    if (json.status !== "success") {
      console.error("Heartbeat error:", json);
    }
  } catch {
    // ignore
  }
}
