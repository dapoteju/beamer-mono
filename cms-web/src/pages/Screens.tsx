import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchScreens } from "../api/screens";
import type { Screen } from "../api/screens";
import { useAuthStore } from "../store/authStore";

export default function Screens() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [regionFilter, setRegionFilter] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("");

  async function loadScreens() {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (regionFilter) params.region = regionFilter;
      if (publisherFilter && user?.orgType === "beamer_internal") {
        params.publisherOrgId = publisherFilter;
      }

      const data = await fetchScreens(params);
      setScreens(data);
    } catch (err: any) {
      console.error("Failed to fetch screens:", err);
      setError(
        err.response?.data?.error || "Failed to load screens. Please try again."
      );

      if (err.response?.status === 403) {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScreens();
  }, [regionFilter, publisherFilter]);

  function handleRowClick(screenId: string) {
    navigate(`/screens/${screenId}`);
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

  const uniqueRegions = Array.from(new Set(screens.map((s) => s.region))).sort();
  
  const publisherMap = new Map<string, { id: string; name: string }>();
  screens.forEach((s) => {
    if (!publisherMap.has(s.publisherOrgId)) {
      publisherMap.set(s.publisherOrgId, { id: s.publisherOrgId, name: s.publisherOrgName });
    }
  });
  const uniquePublishers = Array.from(publisherMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (loading && screens.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading screens...</div>
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Screens & Players
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage digital screens and monitor player status
          </p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-zinc-200">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Region
              </label>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Regions</option>
                {uniqueRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {user?.orgType === "beamer_internal" && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Publisher
                </label>
                <select
                  value={publisherFilter}
                  onChange={(e) => setPublisherFilter(e.target.value)}
                  className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Publishers</option>
                  {uniquePublishers.map((publisher) => (
                    <option key={publisher.id} value={publisher.id}>
                      {publisher.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Screen Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Publisher
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Online/Offline
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Last Heartbeat
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {screens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No screens found
                  </td>
                </tr>
              ) : (
                screens.map((screen) => (
                  <tr
                    key={screen.id}
                    onClick={() => handleRowClick(screen.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                      {screen.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.region}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.publisherOrgName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          screen.status === "active"
                            ? "bg-green-100 text-green-800"
                            : screen.status === "inactive"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {screen.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          screen.isOnline
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {screen.isOnline ? "Online" : "Offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {formatRelativeTime(screen.lastHeartbeatAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
