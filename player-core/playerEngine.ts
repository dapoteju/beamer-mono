import { Creative, Playlist } from "./types";
import { queuePlayback } from "./telemetryService";
import { getLastLocation } from "./gpsService";
import { isAssetValid } from "./assetCache";

function isNodeEnv() {
  return typeof window === "undefined";
}

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
    let playedAny = false;

    for (const creative of playlist.playlist) {
      try {
        const runningInNode = isNodeEnv();

        if (runningInNode && !isAssetValid(creative.local_file_path)) {
          console.warn(
            `Skipping creative ${creative.creative_id} due to invalid or missing local asset`
          );
          queuePlayback({
            creative_id: creative.creative_id,
            screen_id: playlist.screen_id,
            played_at: new Date().toISOString(),
            duration_seconds: 0,
            status: "skipped",
            location: getLastLocation() || undefined,
          });
          continue;
        }

        // In Electron/browser we allow playback even without local_file_path,
        // because renderCreative uses creative.local_file_path || creative.file_url
        onPlay(creative);
        playedAny = true;

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
      } catch (err) {
        console.error(
          `Error during playback of creative ${creative.creative_id}:`,
          err
        );
        queuePlayback({
          creative_id: creative.creative_id,
          screen_id: playlist.screen_id,
          played_at: new Date().toISOString(),
          duration_seconds: 0,
          status: "error",
          location: getLastLocation() || undefined,
        });
      }
    }

    if (!playedAny) {
      console.warn(
        "No valid creatives to play in this cycle. Playlist length:",
        playlist.playlist.length
      );
      await new Promise((res) => setTimeout(res, 10000));
    }
  }
}
