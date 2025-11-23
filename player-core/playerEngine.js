"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPlaybackLoop = startPlaybackLoop;
const types_1 = require("./types");
const telemetryService_1 = require("./telemetryService");
async function startPlaybackLoop(playlist, onPlay) {
    if (!playlist ||
        !Array.isArray(playlist.playlist) || // <- note `playlist.playlist`
        playlist.playlist.length === 0) {
        console.error("Playlist has no creatives to play:", playlist);
        return;
    }
    while (true) {
        for (const creative of playlist.playlist) { // <- note `playlist.playlist`
            onPlay(creative);
            (0, telemetryService_1.queuePlayback)({
                creative_id: creative.creative_id,
                played_at: new Date().toISOString(),
                duration_seconds: creative.duration_seconds,
            });
            await new Promise((res) => setTimeout(res, creative.duration_seconds * 1000));
        }
    }
}
//# sourceMappingURL=playerEngine.js.map