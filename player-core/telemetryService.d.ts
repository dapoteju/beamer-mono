import { PlaybackEvent } from "./types";
export declare function queuePlayback(event: PlaybackEvent): void;
export declare function flushPlaybacks(auth_token: string): Promise<void>;
export declare function sendHeartbeatEvent(auth_token: string, player_id: string): Promise<void>;
//# sourceMappingURL=telemetryService.d.ts.map