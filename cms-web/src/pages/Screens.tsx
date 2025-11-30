import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchScreens } from "../api/screens";
import type { Screen } from "../api/screens";
import { fetchVehicles, type Vehicle } from "../api/vehicles";
import { useAuthStore } from "../store/authStore";
import { ScreenFormModal } from "../components/ScreenFormModal";

export default function Screens() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialVehicle = searchParams.get("vehicle") || "";
  const [regionFilter, setRegionFilter] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState(initialVehicle);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  async function loadVehicles() {
    try {
      const params: any = {};
      if (publisherFilter && user?.orgType === "beamer_internal") {
        params.publisher_org_id = publisherFilter;
      }
      const data = await fetchVehicles(params);
      setVehicles(data.items || []);
    } catch (err: any) {
      console.error("Failed to fetch vehicles:", err);
    }
  }

  useEffect(() => {
    loadScreens();
    loadVehicles();
  }, [regionFilter, publisherFilter]);

  function handleRowClick(screenId: string) {
    navigate(`/screens/${screenId}`);
  }

  function handleVehicleClick(e: React.MouseEvent, publisherOrgId: string) {
    e.stopPropagation();
    const publisher = publishers.find(p => p.id === publisherOrgId);
    if (publisher) {
      navigate(`/publishers/${publisher.id}?tab=vehicles`);
    }
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
  const publishers = Array.from(publisherMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const filteredScreens = screens.filter((screen) => {
    if (classificationFilter && screen.screenClassification !== classificationFilter) {
      return false;
    }
    if (vehicleFilter) {
      if (!screen.vehicle || screen.vehicle.id !== vehicleFilter) {
        return false;
      }
    }
    return true;
  });

  function getTypeLabel(classification?: string): string {
    if (!classification) return "Vehicle";
    switch (classification) {
      case "vehicle": return "Vehicle";
      case "billboard": return "Billboard";
      case "indoor": return "Indoor";
      case "other": return "Other";
      default: return "Unknown";
    }
  }

  function getTypeBadgeColor(classification?: string): string {
    if (!classification || classification === "vehicle") return "bg-blue-100 text-blue-800";
    if (classification === "billboard") return "bg-amber-100 text-amber-800";
    if (classification === "indoor") return "bg-green-100 text-green-800";
    return "bg-zinc-100 text-zinc-800";
  }

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

  const canCreateScreen = user?.orgType === "beamer_internal" && (user?.role === "admin" || user?.role === "ops");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Inventory
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage screens, players, and digital inventory across the network
          </p>
        </div>
        {canCreateScreen && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Screen
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-zinc-200">
          <div className="flex flex-wrap gap-4">
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
                  onChange={(e) => {
                    setPublisherFilter(e.target.value);
                    setVehicleFilter("");
                  }}
                  className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Publishers</option>
                  {publishers.map((publisher) => (
                    <option key={publisher.id} value={publisher.id}>
                      {publisher.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Screen Type
              </label>
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="vehicle">Vehicle</option>
                <option value="billboard">Billboard</option>
                <option value="indoor">Indoor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Vehicle
              </label>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Vehicles</option>
                {vehicles
                  .filter(v => v.isActive)
                  .map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.licensePlate && `(${vehicle.licensePlate})`}
                    </option>
                  ))}
              </select>
            </div>

            {(regionFilter || publisherFilter || classificationFilter || vehicleFilter) && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setRegionFilter("");
                    setPublisherFilter("");
                    setClassificationFilter("");
                    setVehicleFilter("");
                  }}
                  className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Vehicle
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
              {filteredScreens.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                    No screens found
                  </td>
                </tr>
              ) : (
                filteredScreens.map((screen) => (
                  <tr
                    key={screen.id}
                    onClick={() => handleRowClick(screen.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                      {screen.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(screen.screenClassification)}`}
                      >
                        {getTypeLabel(screen.screenClassification)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {screen.vehicle ? (
                        <button
                          onClick={(e) => handleVehicleClick(e, screen.publisherOrgId)}
                          className="text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          {screen.vehicle.name}
                          {screen.vehicle.licensePlate && (
                            <span className="text-zinc-500 font-normal ml-1">
                              ({screen.vehicle.licensePlate})
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.city}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.region}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.publisher 
                        ? screen.publisher.publisherType === "organisation"
                          ? screen.publisher.organisation?.name || screen.publisherOrgName
                          : screen.publisher.fullName || screen.publisherOrgName
                        : screen.publisherOrgName}
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

      {showCreateModal && (
        <ScreenFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadScreens();
          }}
        />
      )}
    </div>
  );
}
