import { initPlayer } from "./index";
import { Creative } from "./types";

export function start(onPlay?: (creative: Creative) => void) {
  initPlayer(onPlay || (() => {}));
}
