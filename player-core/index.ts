import { loadJSON, saveJSON, loadBeamerConfig } from "./storage";
import { registerPlayer, setApiBaseUrl } from "./apiClient";
import { updatePlaylist } from "./playlistService";
import { startPlaybackLoop } from "./playerEngine";
import { queueHeartbeat, flushHeartbeats, flushPlaybacks } from "./telemetryService";
import { startGpsPolling } from "./gpsService";
import { verifyAndRepairAssets } from "./assetCache";

async function initPlayer(onPlay: any) {
  const beamerConfig = loadBeamerConfig();
  console.log("Loaded beamer.config.json:", beamerConfig);

  setApiBaseUrl(beamerConfig.api_base_url);
  console.log("Loaded API base URL from config:", beamerConfig.api_base_url);

  let config = loadJSON("player.json");

  if (!config) {
    console.log("Registering player...");
    config = await registerPlayer(beamerConfig);
    if (!config.software_version) {
      config.software_version = "1.0.0";
    }
    saveJSON("player.json", config);
  }

  if (!config.software_version) {
    config.software_version = "1.0.0";
    saveJSON("player.json", config);
  }

  console.log("Player config:", config);

  startGpsPolling(30_000);

  let playlist = await updatePlaylist(config.auth_token);
  console.log("Loaded playlist:", playlist);

  playlist = await verifyAndRepairAssets(playlist);
  console.log("Verified and repaired assets");

  setInterval(() => {
    queueHeartbeat(config);
    flushHeartbeats(config.auth_token);
    flushPlaybacks(config.auth_token);
  }, 60_000);

  startPlaybackLoop(playlist, onPlay);
}

export { initPlayer };
