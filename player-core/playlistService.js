"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLocalPlaylist = loadLocalPlaylist;
exports.updatePlaylist = updatePlaylist;
const storage_1 = require("./storage");
const types_1 = require("./types");
const apiClient_1 = require("./apiClient");
async function loadLocalPlaylist() {
    return (0, storage_1.loadJSON)("playlist.json");
}
async function updatePlaylist(auth_token) {
    const local = (0, storage_1.loadJSON)("playlist.json");
    const configHash = local?.config_hash;
    const remote = await (0, apiClient_1.fetchPlaylist)(auth_token, configHash);
    // If no new playlist (304 or error), fall back to local
    let playlist = remote || local;
    if (!playlist) {
        throw new Error("No playlist available (remote failed, no local cache)");
    }
    // 🔹 DEV ONLY: if playlist is empty, inject a dummy creative for testing
    if (!Array.isArray(playlist.playlist) || playlist.playlist.length === 0) {
        console.warn("Remote playlist is empty. Injecting a dummy test creative (DEV ONLY).");
        const dummy = {
            creative_id: "dummy_1",
            type: "image",
            file_url: "https://via.placeholder.com/320x108.png?text=Beamer+Test+Ad",
            duration_seconds: 10,
        };
        playlist = {
            ...playlist,
            playlist: [dummy],
        };
    }
    // Save to disk
    (0, storage_1.saveJSON)("playlist.json", playlist);
    return playlist;
}
//# sourceMappingURL=playlistService.js.map