import { PlaybackEvent, HeartbeatEvent, PlayerConfig } from "./types";
import { sendPlaybackEvent, sendHeartbeat } from "./apiClient";
import { getLastLocation } from "./gpsService";
import { getDeviceMetrics } from "./deviceMetricsService";

let playbackQueue: PlaybackEvent[] = [];

export function queuePlayback(event: PlaybackEvent) {
  playbackQueue.push(event);
}

export async function flushPlaybacks(auth_token: string) {
  const queueCopy = [...playbackQueue];
  playbackQueue = [];

  for (const ev of queueCopy) {
    try {
      await sendPlaybackEvent(auth_token, ev);
    } catch (e) {
      console.error("Failed to send playback, requeueing", e);
      playbackQueue.push(ev);
    }
  }
}

export async function sendHeartbeatEvent(
  auth_token: string,
  config: PlayerConfig
) {
  const location = getLastLocation() || undefined;
  const metrics = getDeviceMetrics();

  const hb: HeartbeatEvent = {
    player_id: config.player_id,
    screen_id: config.screen_id,
    timestamp: new Date().toISOString(),
    status: "ok",
    software_version: config.software_version || "1.0.0",
    location,
    metrics,
  };

  try {
    await sendHeartbeat(auth_token, hb);
  } catch (e) {
    console.error("Heartbeat failed", e);
  }
}
