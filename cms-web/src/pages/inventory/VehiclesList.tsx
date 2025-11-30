import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchVehicles, type ListVehiclesParams } from "../../api/vehicles";
import { useAuthStore } from "../../store/authStore";
import { VehicleEditorModal } from "../../components/vehicles/VehicleEditorModal";

export default function VehiclesList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isInternal = user?.orgType === "beamer_internal";

  const [filters, setFilters] = useState<ListVehiclesParams>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["vehicles", filters],
    queryFn: () => fetchVehicles(filters),
  });

  const vehicles = data?.items || [];
  const totalCount = data?.count || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, q: searchQuery || undefined });
  };

  const handleActiveFilterChange = (value: "all" | "active" | "inactive") => {
    setActiveFilter(value);
    setFilters({
      ...filters,
      is_active: value === "all" ? undefined : value === "active",
    });
  };

  const handleRowClick = (vehicleId: string) => {
    navigate(`/inventory/vehicles/${vehicleId}`);
  };

  const canCreateVehicle = user?.role === "admin" || user?.role === "ops";

  const uniqueCities = Array.from(new Set(vehicles.map((v) => v.city).filter(Boolean))).sort();
  const uniqueRegions = Array.from(new Set(vehicles.map((v) => v.region).filter(Boolean))).sort();

  if (isLoading && vehicles.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading vehicles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Failed to load vehicles. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Vehicles</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage vehicles for mobile screens
          </p>
        </div>
        {canCreateVehicle && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Vehicle
          </button>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-zinc-200">
          <div className="flex flex-wrap gap-4 items-end">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name, plate, ID..."
                  className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 text-sm self-end"
              >
                Search
              </button>
            </form>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status
              </label>
              <select
                value={activeFilter}
                onChange={(e) => handleActiveFilterChange(e.target.value as any)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {uniqueCities.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  City
                </label>
                <select
                  value={filters.city || ""}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                  className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city!}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {uniqueRegions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Region
                </label>
                <select
                  value={filters.region || ""}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value || undefined })}
                  className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Regions</option>
                  {uniqueRegions.map((region) => (
                    <option key={region} value={region!}>
                      {region}
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
                  Name
                </th>
                {isInternal && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Publisher
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  License Plate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Make/Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Screens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={isInternal ? 8 : 7} className="px-4 py-8 text-center text-zinc-500">
                    No vehicles found
                  </td>
                </tr>
              ) : (
                vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    onClick={() => handleRowClick(vehicle.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                      {vehicle.name}
                      {vehicle.externalId && (
                        <span className="text-xs text-zinc-500 ml-2">
                          ({vehicle.externalId})
                        </span>
                      )}
                    </td>
                    {isInternal && (
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {vehicle.publisherOrgName || "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {vehicle.licensePlate || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {vehicle.makeModel || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {vehicle.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {vehicle.region || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {vehicle.screensCount} screen{vehicle.screensCount !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {vehicle.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalCount > 0 && (
          <div className="px-4 py-3 border-t border-zinc-200 text-sm text-zinc-600">
            Showing {vehicles.length} of {totalCount} vehicles
          </div>
        )}
      </div>

      {showCreateModal && (
        <VehicleEditorModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
