import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { fetchScreenLastPlay } from "../api/screens";
import type { LastPlayEventResponse } from "../api/screens";
import "leaflet/dist/leaflet.css";

interface ScreenLastPlayedTabProps {
  screenId: string;
}

export function ScreenLastPlayedTab({ screenId }: ScreenLastPlayedTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LastPlayEventResponse[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<LastPlayEventResponse | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  async function loadLastPlays(isInitialLoad = false) {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      const data = await fetchScreenLastPlay(screenId, 20);
      if (isMountedRef.current) {
        setEvents(data);
      }
    } catch (err: any) {
      console.error("Failed to fetch last play events:", err);
      if (isMountedRef.current) {
        setError(err.response?.data?.error || "Failed to load play history");
      }
    } finally {
      if (isMountedRef.current && isInitialLoad) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true;
    loadLastPlays(true);

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadLastPlays(false);
      }
    }, 10000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [screenId]);

  function formatDateTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case "success":
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
      case "failed":
        return "bg-red-100 text-red-800";
      case "skipped":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-zinc-600">Loading play history...</div>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            Last Played ({events.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Auto-refreshes every 10 seconds
          </p>
        </div>
        <button
          onClick={() => loadLastPlays(false)}
          className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-600">No play events recorded for this screen yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Thumbnail
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Creative
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Played At
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-700">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {events.map((event, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="w-12 h-8 bg-zinc-100 rounded overflow-hidden flex items-center justify-center">
                        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-900 font-medium truncate max-w-[200px]">
                        {event.creative_name || event.creative_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-zinc-900">
                          {formatRelativeTime(event.started_at)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDateTime(event.started_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {event.duration_seconds}s
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                          event.play_status
                        )}`}
                      >
                        {event.play_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {event.lat && event.lng ? (
                        <button
                          onClick={() => setSelectedEvent(event)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          View
                        </button>
                      ) : (
                        <span className="text-zinc-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEvent && selectedEvent.lat && selectedEvent.lng && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
              <h3 className="text-sm font-semibold text-zinc-900">
                Play Event Location
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="mb-3 text-sm">
                <p className="font-medium text-zinc-900">
                  {selectedEvent.creative_name || selectedEvent.creative_id}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  {formatDateTime(selectedEvent.started_at)}
                </p>
              </div>
              <div className="h-64 rounded-lg overflow-hidden">
                <MapContainer
                  center={[selectedEvent.lat, selectedEvent.lng]}
                  zoom={14}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={[selectedEvent.lat, selectedEvent.lng]}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-medium">{selectedEvent.creative_name}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {formatDateTime(selectedEvent.started_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedEvent.lat.toFixed(6)}, {selectedEvent.lng.toFixed(6)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <div className="mt-3 text-xs text-zinc-500 text-center">
                Coordinates: {selectedEvent.lat.toFixed(6)}, {selectedEvent.lng.toFixed(6)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
