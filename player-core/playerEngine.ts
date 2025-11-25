import { Creative, Playlist } from "./types";
import { queuePlayback } from "./telemetryService";
import { getLastLocation } from "./gpsService";

export async function startPlaybackLoop(
  playlist: Playlist,
  onPlay: (creative: Creative) => void
) {
  if (
    !playlist ||
    !Array.isArray(playlist.playlist) ||
    playlist.playlist.length === 0
  ) {
    console.error("Playlist has no creatives to play:", playlist);
    return;
  }

  while (true) {
    for (const creative of playlist.playlist) {
      onPlay(creative);

      const location = getLastLocation() || undefined;

      queuePlayback({
        creative_id: creative.creative_id,
        screen_id: playlist.screen_id,
        played_at: new Date().toISOString(),
        duration_seconds: creative.duration_seconds,
        status: "success",
        location,
      });

      await new Promise((res) =>
        setTimeout(res, creative.duration_seconds * 1000)
      );
    }
  }
}
