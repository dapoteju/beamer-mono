"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const types_1 = require("./types");
// This function will be called every time a creative should play
function onPlay(creative) {
    console.log("====================================");
    console.log("NOW PLAYING:");
    console.log(`Creative ID: ${creative.creative_id}`);
    console.log(`Type:        ${creative.type}`);
    console.log(`Duration:    ${creative.duration_seconds} seconds`);
    console.log(`File URL:    ${creative.file_url}`);
    console.log("====================================\n");
}
// Start the simulated player
(0, index_1.initPlayer)(onPlay).catch((err) => {
    console.error("Failed to start player:", err);
});
//# sourceMappingURL=simulate.js.map