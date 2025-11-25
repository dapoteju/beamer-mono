import { PlaybackEvent, HeartbeatEvent, PlayerConfig } from "./types";
import { sendPlaybackEvent, sendHeartbeat } from "./apiClient";
import { getLastLocation } from "./gpsService";
import { getDeviceMetrics } from "./deviceMetricsService";
import { loadEventQueue, saveEventQueue } from "./storage";

const PLAYBACK_QUEUE_FILE = "pending-playbacks.json";
const HEARTBEAT_QUEUE_FILE = "pending-heartbeats.json";

function loadPlaybackQueue(): PlaybackEvent[] {
  return loadEventQueue<PlaybackEvent>(PLAYBACK_QUEUE_FILE);
}

function savePlaybackQueue(events: PlaybackEvent[]): void {
  saveEventQueue<PlaybackEvent>(PLAYBACK_QUEUE_FILE, events);
}

function loadHeartbeatQueue(): HeartbeatEvent[] {
  return loadEventQueue<HeartbeatEvent>(HEARTBEAT_QUEUE_FILE);
}

function saveHeartbeatQueue(events: HeartbeatEvent[]): void {
  saveEventQueue<HeartbeatEvent>(HEARTBEAT_QUEUE_FILE, events);
}

export function queuePlayback(event: PlaybackEvent) {
  try {
    const queue = loadPlaybackQueue();
    queue.push(event);
    savePlaybackQueue(queue);
  } catch (err) {
    console.error("Failed to queue playback event:", err);
  }
}

export async function flushPlaybacks(auth_token: string) {
  let queue = loadPlaybackQueue();
  if (!queue.length) return;

  const remaining: PlaybackEvent[] = [];

  for (const ev of queue) {
    try {
      await sendPlaybackEvent(auth_token, ev);
    } catch (err) {
      console.error("Failed to send playback event, will retry later:", err);
      remaining.push(ev);
    }
  }

  savePlaybackQueue(remaining);
}

export function queueHeartbeat(config: PlayerConfig) {
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
    const queue = loadHeartbeatQueue();
    queue.push(hb);
    saveHeartbeatQueue(queue);
  } catch (err) {
    console.error("Failed to queue heartbeat:", err);
  }
}

export async function flushHeartbeats(auth_token: string) {
  let queue = loadHeartbeatQueue();
  if (!queue.length) return;

  const remaining: HeartbeatEvent[] = [];

  for (const hb of queue) {
    try {
      await sendHeartbeat(auth_token, hb);
    } catch (err) {
      console.error("Failed to send heartbeat, will retry later:", err);
      remaining.push(hb);
    }
  }

  saveHeartbeatQueue(remaining);
}
