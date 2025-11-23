"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = start;
const index_1 = require("./index");
const types_1 = require("./types");
function start(onPlay) {
    (0, index_1.initPlayer)(onPlay || (() => { }));
}
//# sourceMappingURL=entry.js.map