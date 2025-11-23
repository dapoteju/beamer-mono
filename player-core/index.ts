import { loadJSON, saveJSON } from "./storage";
import { registerPlayer } from "./apiClient";
import { updatePlaylist } from "./playlistService";
import { startPlaybackLoop } from "./playerEngine";
import { flushPlaybacks, sendHeartbeatEvent } from "./telemetryService";

async function initPlayer(onPlay: any) {
  let config = loadJSON("player.json");

  if (!config) {
    console.log("Registering player...");
    config = await registerPlayer();
    saveJSON("player.json", config);
  }

  console.log("Player config:", config);

  const playlist = await updatePlaylist(config.auth_token);
  console.log("Loaded playlist:", playlist);

  // Heartbeat every 60s
  setInterval(() => {
    sendHeartbeatEvent(config.auth_token, config.player_id);
    flushPlaybacks(config.auth_token);
  }, 60_000);

  // Start playback
  startPlaybackLoop(playlist, onPlay);
}

export { initPlayer };
