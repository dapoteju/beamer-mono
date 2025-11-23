"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPlayer = initPlayer;
const storage_1 = require("./storage");
const apiClient_1 = require("./apiClient");
const playlistService_1 = require("./playlistService");
const playerEngine_1 = require("./playerEngine");
const telemetryService_1 = require("./telemetryService");
async function initPlayer(onPlay) {
    let config = (0, storage_1.loadJSON)("player.json");
    if (!config) {
        console.log("Registering player...");
        config = await (0, apiClient_1.registerPlayer)();
        (0, storage_1.saveJSON)("player.json", config);
    }
    console.log("Player config:", config);
    const playlist = await (0, playlistService_1.updatePlaylist)(config.auth_token);
    console.log("Loaded playlist:", playlist);
    // Heartbeat every 60s
    setInterval(() => {
        (0, telemetryService_1.sendHeartbeatEvent)(config.auth_token, config.player_id);
        (0, telemetryService_1.flushPlaybacks)(config.auth_token);
    }, 60_000);
    // Start playback
    (0, playerEngine_1.startPlaybackLoop)(playlist, onPlay);
}
//# sourceMappingURL=index.js.map