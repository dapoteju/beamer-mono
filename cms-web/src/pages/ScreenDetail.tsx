import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import {
  fetchScreenDetail,
  fetchScreenHeartbeats,
  fetchScreenPlayEvents,
  fetchScreenLocationHistory,
} from "../api/screens";
import type {
  ScreenDetail as ScreenDetailType,
  Heartbeat,
  PlayEvent,
  LocationHistoryPoint,
} from "../api/screens";
import { ScreenFormModal } from "../components/ScreenFormModal";
import { ScreenPlaylistTab } from "../components/ScreenPlaylistTab";
import { ScreenLastPlayedTab } from "../components/ScreenLastPlayedTab";
import { useAuthStore } from "../store/authStore";
import "leaflet/dist/leaflet.css";

export default function ScreenDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [detail, setDetail] = useState<ScreenDetailType | null>(null);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [playEvents, setPlayEvents] = useState<PlayEvent[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryPoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "playlist" | "last-played" | "play-events" | "heartbeats" | "movement">(
    "overview"
  );
  const [timeRange, setTimeRange] = useState("24h");
  const [showEditModal, setShowEditModal] = useState(false);

  async function loadScreenDetail() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const data = await fetchScreenDetail(id);
      setDetail(data);

      await loadPlayEvents();
      await loadHeartbeats();
    } catch (err: any) {
      console.error("Failed to fetch screen detail:", err);
      setError(
        err.response?.data?.error || "Failed to load screen details. Please try again."
      );

      if (err.response?.status === 403 || err.response?.status === 404) {
        setTimeout(() => navigate("/screens"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayEvents() {
    if (!id) return;

    try {
      const hours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 24;
      const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const events = await fetchScreenPlayEvents(id, { from, limit: 100 });
      setPlayEvents(events);
    } catch (err: any) {
      console.error("Failed to fetch play events:", err);
    }
  }

  async function loadHeartbeats() {
    if (!id) return;

    try {
      const hours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 24;
      const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const beats = await fetchScreenHeartbeats(id, { from });
      setHeartbeats(beats);
    } catch (err: any) {
      console.error("Failed to fetch heartbeats:", err);
    }
  }

  async function loadLocationHistory() {
    if (!id) return;

    try {
      const hours = timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 24;
      const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const history = await fetchScreenLocationHistory(id, from);
      setLocationHistory(history);
    } catch (err: any) {
      console.error("Failed to fetch location history:", err);
    }
  }

  useEffect(() => {
    loadScreenDetail();
  }, [id]);

  useEffect(() => {
    if (activeTab === "play-events") {
      loadPlayEvents();
    } else if (activeTab === "heartbeats") {
      loadHeartbeats();
    } else if (activeTab === "movement") {
      loadLocationHistory();
    }
  }, [activeTab, timeRange]);

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

  function formatRelativeTime(timestamp: string | null): string {
    if (!timestamp) return "—";

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading screen details...</div>
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

  if (!detail) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        Screen not found
      </div>
    );
  }

  const { screen, player, stats, recentPlayEvents } = detail;

  // Check if user can edit this screen
  const canEdit =
    user?.orgType === "beamer_internal" ||
    (user?.orgType === "publisher" && user?.orgId === screen.publisherOrgId);

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate("/screens")}
          className="text-sm text-blue-600 hover:text-blue-700 mb-2"
        >
          ← Back to Screens
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {screen.code}
              {screen.name && (
                <span className="text-zinc-500 font-normal ml-2">• {screen.name}</span>
              )}
            </h1>
            <p className="text-sm text-zinc-600 mt-1">
              {screen.city}, {screen.regionCode} • {
                screen.publisher 
                  ? screen.publisher.publisherType === "organisation"
                    ? screen.publisher.organisation?.name || screen.publisherOrgName
                    : screen.publisher.fullName || screen.publisherOrgName
                  : screen.publisherOrgName
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                player?.isOnline
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {player?.isOnline ? "Online" : "Offline"}
            </span>
            {canEdit && (
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Screen
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">Screen Info</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-zinc-500">Classification:</span>{" "}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                screen.screenClassification === "vehicle" ? "bg-blue-100 text-blue-800" :
                screen.screenClassification === "billboard" ? "bg-amber-100 text-amber-800" :
                screen.screenClassification === "indoor" ? "bg-green-100 text-green-800" :
                "bg-zinc-100 text-zinc-800"
              }`}>
                {screen.screenClassification === "vehicle" ? "Vehicle" :
                 screen.screenClassification === "billboard" ? "Billboard" :
                 screen.screenClassification === "indoor" ? "Indoor" :
                 screen.screenClassification || "Vehicle"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Type:</span>{" "}
              <span className="text-zinc-900">{screen.screenType}</span>
            </div>
            <div>
              <span className="text-zinc-500">Resolution:</span>{" "}
              <span className="text-zinc-900">
                {screen.resolutionWidth} x {screen.resolutionHeight}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Status:</span>{" "}
              <span className="text-zinc-900 capitalize">{screen.status}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">Player Info</h3>
          {player ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-zinc-500">Player ID:</span>{" "}
                <span className="text-zinc-900 font-mono text-xs">{player.id}</span>
              </div>
              <div>
                <span className="text-zinc-500">Software:</span>{" "}
                <span className="text-zinc-900">{player.softwareVersion || "—"}</span>
              </div>
              <div>
                <span className="text-zinc-500">Last Heartbeat:</span>{" "}
                <span className="text-zinc-900">
                  {formatRelativeTime(player.lastHeartbeatAt)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No player attached</p>
          )}
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">Play Stats</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-zinc-500">Last 24h:</span>{" "}
              <span className="text-zinc-900 font-semibold">
                {stats.playCount24h} plays
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Last 7d:</span>{" "}
              <span className="text-zinc-900 font-semibold">
                {stats.playCount7d} plays
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="border-b border-zinc-200">
          <div className="flex items-center justify-between px-4">
            <nav className="flex space-x-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("playlist")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "playlist"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Playlist
              </button>
              <button
                onClick={() => setActiveTab("last-played")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "last-played"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Last Played
              </button>
              <button
                onClick={() => setActiveTab("play-events")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "play-events"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Play Events
              </button>
              <button
                onClick={() => setActiveTab("heartbeats")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "heartbeats"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                }`}
              >
                Heartbeats
              </button>
              {screen.screenClassification === "vehicle" && (
                <button
                  onClick={() => setActiveTab("movement")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "movement"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                  }`}
                >
                  Movement
                </button>
              )}
            </nav>

            {(activeTab === "play-events" || activeTab === "heartbeats" || activeTab === "movement") && (
              <div>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-3 py-1.5 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "overview" && (
            <div>
              {/* Vehicle Metadata Section */}
              {screen.screenClassification === "vehicle" && screen.vehicle && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Vehicle Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {screen.vehicle.licencePlate && (
                      <div>
                        <span className="text-zinc-600">Licence Plate:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.vehicle.licencePlate}</span>
                      </div>
                    )}
                    {(screen.vehicle.make || screen.vehicle.model) && (
                      <div>
                        <span className="text-zinc-600">Make / Model:</span>{" "}
                        <span className="text-zinc-900 font-medium">
                          {[screen.vehicle.make, screen.vehicle.model].filter(Boolean).join(" ")}
                        </span>
                      </div>
                    )}
                    {screen.vehicle.colour && (
                      <div>
                        <span className="text-zinc-600">Colour:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.vehicle.colour}</span>
                      </div>
                    )}
                    {(screen.publisher || screen.vehicle.publisherOrgName) && (
                      <div>
                        <span className="text-zinc-600">Fleet:</span>{" "}
                        <span className="text-zinc-900 font-medium">
                          {screen.publisher 
                            ? screen.publisher.publisherType === "organisation"
                              ? screen.publisher.organisation?.name || screen.vehicle.publisherOrgName
                              : screen.publisher.fullName || screen.vehicle.publisherOrgName
                            : screen.vehicle.publisherOrgName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Billboard Metadata Section */}
              {screen.screenClassification === "billboard" && (
                <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Billboard Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {screen.structureType && (
                      <div>
                        <span className="text-zinc-600">Structure:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.structureType}</span>
                      </div>
                    )}
                    {screen.sizeDescription && (
                      <div>
                        <span className="text-zinc-600">Size:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.sizeDescription}</span>
                      </div>
                    )}
                    {screen.illuminationType && (
                      <div>
                        <span className="text-zinc-600">Illumination:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.illuminationType}</span>
                      </div>
                    )}
                    {screen.address && (
                      <div className="col-span-2">
                        <span className="text-zinc-600">Address:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Indoor/Venue Metadata Section */}
              {screen.screenClassification === "indoor" && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Indoor / Venue Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {screen.venueName && (
                      <div>
                        <span className="text-zinc-600">Venue:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.venueName}</span>
                      </div>
                    )}
                    {screen.venueType && (
                      <div>
                        <span className="text-zinc-600">Type:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.venueType}</span>
                      </div>
                    )}
                    {screen.venueAddress && (
                      <div className="col-span-2">
                        <span className="text-zinc-600">Address:</span>{" "}
                        <span className="text-zinc-900 font-medium">{screen.venueAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Recent Play Events
              </h3>
              {recentPlayEvents.length === 0 ? (
                <p className="text-sm text-zinc-500">No recent play events</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Time
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Creative
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Campaign
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {recentPlayEvents.map((event, idx) => (
                        <tr key={idx}>
                          <td className="py-2 text-zinc-600">
                            {formatDateTime(event.timestamp)}
                          </td>
                          <td className="py-2 text-zinc-900">
                            {event.creativeName || event.creativeId}
                          </td>
                          <td className="py-2 text-zinc-900">
                            {event.campaignName || event.campaignId}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                event.playStatus === "success" ||
                                event.playStatus === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {event.playStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "playlist" && id && (
            <ScreenPlaylistTab screenId={id} />
          )}

          {activeTab === "last-played" && id && (
            <ScreenLastPlayedTab screenId={id} />
          )}

          {activeTab === "play-events" && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Play Events ({playEvents.length})
              </h3>
              {playEvents.length === 0 ? (
                <p className="text-sm text-zinc-500">No play events in this time range</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Time
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Creative
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Campaign
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Duration
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {playEvents.map((event, idx) => (
                        <tr key={idx}>
                          <td className="py-2 text-zinc-600">
                            {formatDateTime(event.timestamp)}
                          </td>
                          <td className="py-2 text-zinc-900">
                            {event.creativeName || event.creativeId}
                          </td>
                          <td className="py-2 text-zinc-900">
                            {event.campaignName || event.campaignId}
                          </td>
                          <td className="py-2 text-zinc-600">
                            {event.durationSeconds
                              ? `${event.durationSeconds}s`
                              : "—"}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                event.playStatus === "success" ||
                                event.playStatus === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {event.playStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "heartbeats" && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Heartbeats ({heartbeats.length})
              </h3>
              {heartbeats.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No heartbeats in this time range
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Timestamp
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Status
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Software
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Storage Free
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          CPU Usage
                        </th>
                        <th className="pb-2 text-left font-medium text-zinc-700">
                          Network
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {heartbeats.map((beat, idx) => (
                        <tr key={idx}>
                          <td className="py-2 text-zinc-600">
                            {formatDateTime(beat.timestamp)}
                          </td>
                          <td className="py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {beat.status}
                            </span>
                          </td>
                          <td className="py-2 text-zinc-600">
                            {beat.softwareVersion || "—"}
                          </td>
                          <td className="py-2 text-zinc-600">
                            {beat.storageFreeMb ? `${beat.storageFreeMb} MB` : "—"}
                          </td>
                          <td className="py-2 text-zinc-600">
                            {beat.cpuUsage ? `${beat.cpuUsage}%` : "—"}
                          </td>
                          <td className="py-2 text-zinc-600">
                            {beat.networkType || "—"}
                            {beat.signalStrength && ` (${beat.signalStrength})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "movement" && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Movement History ({locationHistory.length} points)
              </h3>
              {locationHistory.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No movement history available for this period.
                </p>
              ) : (
                <div style={{ height: "500px", width: "100%" }}>
                  <MapContainer
                    center={[locationHistory[0].latitude, locationHistory[0].longitude]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    <Polyline
                      positions={locationHistory.map(point => [point.latitude, point.longitude])}
                      color="blue"
                      weight={3}
                      opacity={0.7}
                    />
                    
                    {locationHistory.length > 0 && (
                      <>
                        <Marker position={[locationHistory[0].latitude, locationHistory[0].longitude]}>
                          <Popup>
                            <div className="text-sm">
                              <div className="font-bold">Start</div>
                              <div className="text-xs text-gray-600">
                                {new Date(locationHistory[0].recordedAt).toLocaleString()}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                        <Marker position={[
                          locationHistory[locationHistory.length - 1].latitude,
                          locationHistory[locationHistory.length - 1].longitude
                        ]}>
                          <Popup>
                            <div className="text-sm">
                              <div className="font-bold">End</div>
                              <div className="text-xs text-gray-600">
                                {new Date(locationHistory[locationHistory.length - 1].recordedAt).toLocaleString()}
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </>
                    )}
                  </MapContainer>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Screen Modal */}
      {showEditModal && (
        <ScreenFormModal
          mode="edit"
          screenId={id}
          initialValues={{
            name: screen.name,
            city: screen.city,
            regionCode: screen.regionCode,
            publisherOrgId: screen.publisherOrgId,
            publisherId: screen.publisher?.id || null,
            status: screen.status,
            playerId: player?.id || null,
            screenClassification: screen.screenClassification || "vehicle",
            vehicleId: screen.vehicleId || null,
            structureType: screen.structureType || null,
            sizeDescription: screen.sizeDescription || null,
            illuminationType: screen.illuminationType || null,
            address: screen.address || null,
            venueName: screen.venueName || null,
            venueType: screen.venueType || null,
            venueAddress: screen.venueAddress || null,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadScreenDetail();
          }}
        />
      )}
    </div>
  );
}
