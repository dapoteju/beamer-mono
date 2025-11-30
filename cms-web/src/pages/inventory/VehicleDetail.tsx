import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchVehicle, fetchVehicleScreens, deleteVehicle, type VehicleScreen } from "../../api/vehicles";
import { useAuthStore } from "../../store/authStore";
import { VehicleEditorModal } from "../../components/vehicles/VehicleEditorModal";

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isInternal = user?.orgType === "beamer_internal";

  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "screens">("details");

  const { data: vehicle, isLoading, error, refetch } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => fetchVehicle(id!),
    enabled: !!id,
  });

  const { data: screens = [], isLoading: screensLoading } = useQuery({
    queryKey: ["vehicle-screens", id],
    queryFn: () => fetchVehicleScreens(id!),
    enabled: !!id && activeTab === "screens",
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(id!, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      navigate("/inventory/vehicles");
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to deactivate vehicle");
    },
  });

  const canEdit = user?.role === "admin" || user?.role === "ops";

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to deactivate this vehicle?")) {
      deleteMutation.mutate();
    }
  };

  const handleScreenClick = (screenId: string) => {
    navigate(`/screens/${screenId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading vehicle...</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Vehicle not found or failed to load.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
            <button
              onClick={() => navigate("/inventory/vehicles")}
              className="hover:text-blue-600"
            >
              Vehicles
            </button>
            <span>/</span>
            <span>{vehicle.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900">{vehicle.name}</h1>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                vehicle.isActive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {vehicle.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Vehicle
            </button>
            {vehicle.isActive && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="border-b border-zinc-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === "details"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab("screens")}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === "screens"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Screens ({vehicle.screensCount})
            </button>
          </nav>
        </div>

        {activeTab === "details" && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Name</h3>
                <p className="text-zinc-900">{vehicle.name}</p>
              </div>

              {isInternal && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-500 mb-1">Publisher</h3>
                  <p className="text-zinc-900">{vehicle.publisherOrgName || "—"}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">External ID</h3>
                <p className="text-zinc-900">{vehicle.externalId || "—"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">License Plate</h3>
                <p className="text-zinc-900">{vehicle.licensePlate || "—"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Make / Model</h3>
                <p className="text-zinc-900">{vehicle.makeModel || "—"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">City</h3>
                <p className="text-zinc-900">{vehicle.city || "—"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Region</h3>
                <p className="text-zinc-900">{vehicle.region || "—"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Screens</h3>
                <p className="text-zinc-900">{vehicle.screensCount} linked screen(s)</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Created</h3>
                <p className="text-zinc-900">
                  {new Date(vehicle.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-1">Last Updated</h3>
                <p className="text-zinc-900">
                  {new Date(vehicle.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "screens" && (
          <div className="p-6">
            {screensLoading ? (
              <div className="text-zinc-600">Loading screens...</div>
            ) : screens.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                No screens linked to this vehicle
              </div>
            ) : (
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
                        Resolution
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                        Orientation
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                        City
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-700 uppercase tracking-wider">
                        Online
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200">
                    {screens.map((screen: VehicleScreen) => (
                      <tr
                        key={screen.id}
                        onClick={() => handleScreenClick(screen.id)}
                        className="hover:bg-zinc-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                          {screen.code}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {screen.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {screen.widthPx} x {screen.heightPx}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600 capitalize">
                          {screen.orientation}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {screen.city}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              screen.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {screen.isActive ? "Active" : "Inactive"}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <VehicleEditorModal
          mode="edit"
          vehicleId={id}
          initialValues={{
            name: vehicle.name,
            publisherOrgId: vehicle.publisherOrgId,
            externalId: vehicle.externalId,
            licensePlate: vehicle.licensePlate,
            makeModel: vehicle.makeModel,
            city: vehicle.city,
            region: vehicle.region,
            isActive: vehicle.isActive,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
