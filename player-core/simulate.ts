import { initPlayer } from "./index";
import { Creative } from "./types";

// This function will be called every time a creative should play
function onPlay(creative: Creative) {
  console.log("====================================");
  console.log("NOW PLAYING:");
  console.log(`Creative ID: ${creative.creative_id}`);
  console.log(`Type:        ${creative.type}`);
  console.log(`Duration:    ${creative.duration_seconds} seconds`);
  console.log(`File URL:    ${creative.file_url}`);
  console.log("====================================\n");
}

// Start the simulated player
initPlayer(onPlay).catch((err) => {
  console.error("Failed to start player:", err);
});
