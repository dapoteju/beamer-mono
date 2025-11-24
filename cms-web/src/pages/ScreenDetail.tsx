import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchScreenDetail,
  fetchScreenHeartbeats,
  fetchScreenPlayEvents,
} from "../api/screens";
import type {
  ScreenDetail as ScreenDetailType,
  Heartbeat,
  PlayEvent,
} from "../api/screens";

export default function ScreenDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ScreenDetailType | null>(null);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [playEvents, setPlayEvents] = useState<PlayEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "play-events" | "heartbeats">(
    "overview"
  );
  const [timeRange, setTimeRange] = useState("24h");

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

  useEffect(() => {
    loadScreenDetail();
  }, [id]);

  useEffect(() => {
    if (activeTab === "play-events") {
      loadPlayEvents();
    } else if (activeTab === "heartbeats") {
      loadHeartbeats();
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
            <h1 className="text-2xl font-semibold text-zinc-900">{screen.name}</h1>
            <p className="text-sm text-zinc-600 mt-1">
              {screen.city}, {screen.regionCode} • {screen.publisherOrgName}
            </p>
          </div>
          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                player?.isOnline
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {player?.isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-700 mb-3">Screen Info</h3>
          <div className="space-y-2 text-sm">
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
            </nav>

            {(activeTab === "play-events" || activeTab === "heartbeats") && (
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
        </div>
      </div>
    </div>
  );
}
