import { PlayerConfig, Playlist, PlaybackEvent, HeartbeatEvent } from "./types";
export declare function registerPlayer(): Promise<PlayerConfig>;
export declare function fetchPlaylist(auth_token: string, config_hash?: string): Promise<Playlist | null>;
export declare function sendPlaybackEvent(auth_token: string, event: PlaybackEvent): Promise<void>;
export declare function sendHeartbeat(auth_token: string, hb: HeartbeatEvent): Promise<void>;
//# sourceMappingURL=apiClient.d.ts.map