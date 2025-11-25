import { useEffect, useState } from "react";
import { fetchScreenPlaylist } from "../api/screens";
import type {
  PlaylistPreviewResponse,
  PlaylistPreviewCreative,
  PlaylistPreviewFlight,
} from "../api/screens";

interface ScreenPlaylistTabProps {
  screenId: string;
}

export function ScreenPlaylistTab({ screenId }: ScreenPlaylistTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistPreviewResponse | null>(null);

  async function loadPlaylist() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScreenPlaylist(screenId);
      setPlaylist(data);
    } catch (err: any) {
      console.error("Failed to fetch playlist preview:", err);
      setError(err.response?.data?.error || "Failed to load playlist preview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaylist();
  }, [screenId]);

  function formatDateTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isVideoFile(url: string): boolean {
    const videoExtensions = [".mp4", ".webm", ".mov", ".avi"];
    return videoExtensions.some((ext) => url.toLowerCase().includes(ext));
  }

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-zinc-600">Loading playlist preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        No playlist data available
      </div>
    );
  }

  const hasNoContent = playlist.creatives.length === 0 && playlist.flights.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Current Playlist Preview
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Generated at {formatDateTime(playlist.generated_at)} for region {playlist.region}
          </p>
        </div>
        <button
          onClick={loadPlaylist}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
        >
          Refresh
        </button>
      </div>

      {playlist.fallback_used && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-amber-800">
              Fallback Creative Active
            </span>
          </div>
          <p className="text-xs text-amber-700 mt-1 ml-6">
            No active flights are targeting this screen. A fallback creative is being used.
          </p>
        </div>
      )}

      {hasNoContent && !playlist.fallback_used && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-red-800">
              Empty Playlist Warning
            </span>
          </div>
          <p className="text-sm text-red-700 mt-2 ml-7">
            No creatives are currently assigned to play on this screen. Check flight targeting 
            and creative approvals for the {playlist.region} region.
          </p>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h4 className="text-sm font-medium text-zinc-800">
            Active Creatives ({playlist.creatives.length})
          </h4>
        </div>
        {playlist.creatives.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500 text-center">
            No creatives assigned
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {playlist.creatives.map((creative: PlaylistPreviewCreative) => (
              <div key={creative.creative_id} className="p-4 flex items-center gap-4">
                <div className="w-20 h-14 bg-zinc-100 rounded overflow-hidden flex-shrink-0">
                  {isVideoFile(creative.file_url) ? (
                    <video
                      src={creative.file_url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <img
                      src={creative.file_url}
                      alt={creative.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%23999' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {creative.name}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {creative.duration_seconds}s duration
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Weight: {creative.weight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h4 className="text-sm font-medium text-zinc-800">
            Active Flights ({playlist.flights.length})
          </h4>
        </div>
        {playlist.flights.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500 text-center">
            No active flights targeting this screen
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {playlist.flights.map((flight: PlaylistPreviewFlight) => (
              <div key={flight.flight_id} className="p-4">
                <p className="text-sm font-medium text-zinc-900">
                  {flight.name}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatDateTime(flight.start_datetime)} - {formatDateTime(flight.end_datetime)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
        <h4 className="text-xs font-medium text-zinc-700 uppercase tracking-wide mb-2">
          Region Filtering Status
        </h4>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            {playlist.region}
          </span>
          <span className="text-xs text-zinc-500">
            Creatives filtered by regional approval
          </span>
        </div>
      </div>
    </div>
  );
}
