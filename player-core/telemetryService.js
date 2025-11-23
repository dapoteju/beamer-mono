"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queuePlayback = queuePlayback;
exports.flushPlaybacks = flushPlaybacks;
exports.sendHeartbeatEvent = sendHeartbeatEvent;
const types_1 = require("./types");
const apiClient_1 = require("./apiClient");
let playbackQueue = [];
function queuePlayback(event) {
    playbackQueue.push(event);
}
async function flushPlaybacks(auth_token) {
    const queueCopy = [...playbackQueue];
    playbackQueue = [];
    for (const ev of queueCopy) {
        try {
            await (0, apiClient_1.sendPlaybackEvent)(auth_token, ev);
        }
        catch (e) {
            console.error("Failed to send playback, requeueing", e);
            playbackQueue.push(ev);
        }
    }
}
async function sendHeartbeatEvent(auth_token, player_id) {
    const hb = {
        player_id,
        status: "ok",
        timestamp: new Date().toISOString()
    };
    try {
        await (0, apiClient_1.sendHeartbeat)(auth_token, hb);
    }
    catch (e) {
        console.error("Heartbeat failed", e);
    }
}
//# sourceMappingURL=telemetryService.js.map