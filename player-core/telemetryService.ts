import { PlaybackEvent, HeartbeatEvent } from "./types";
import { sendPlaybackEvent, sendHeartbeat } from "./apiClient";

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

export async function sendHeartbeatEvent(auth_token: string, player_id: string) {
  const hb: HeartbeatEvent = {
    player_id,
    status: "ok",
    timestamp: new Date().toISOString()
  };

  try {
    await sendHeartbeat(auth_token, hb);
  } catch (e) {
    console.error("Heartbeat failed", e);
  }
}
