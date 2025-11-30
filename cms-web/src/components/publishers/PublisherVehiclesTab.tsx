import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchVehicles, deleteVehicle, type Vehicle } from "../../api/vehicles";
import { useAuthStore } from "../../store/authStore";
import { VehicleEditorModal } from "../vehicles/VehicleEditorModal";

interface PublisherVehiclesTabProps {
  publisherOrgId: string | null;
}

export function PublisherVehiclesTab({ publisherOrgId }: PublisherVehiclesTabProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["publisher-vehicles", publisherOrgId],
    queryFn: () => fetchVehicles({ publisher_org_id: publisherOrgId || undefined }),
    enabled: !!publisherOrgId,
  });

  const vehicles = data?.items || [];

  const deleteMutation = useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle(vehicleId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisher-vehicles", publisherOrgId] });
      refetch();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to deactivate vehicle");
    },
  });

  const canManage = user?.role === "admin" || user?.role === "ops";

  const handleDeactivate = (vehicle: Vehicle) => {
    if (window.confirm(`Are you sure you want to deactivate "${vehicle.name}"?`)) {
      deleteMutation.mutate(vehicle.id);
    }
  };

  const handleScreenClick = (vehicleId: string) => {
    navigate(`/screens?vehicle=${vehicleId}`);
  };

  if (!publisherOrgId) {
    return (
      <div className="px-6 py-8 text-center text-sm text-zinc-500">
        Individual publishers cannot have vehicles. Vehicles are linked to publisher organisations.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-zinc-600">Loading vehicles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded m-4">
        Failed to load vehicles. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Vehicles ({vehicles.length})</h2>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            + Add Vehicle
          </button>
        )}
      </div>

      {vehicles.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-zinc-500">
          No vehicles registered for this publisher.
          {canManage && (
            <p className="mt-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Add your first vehicle
              </button>
            </p>
          )}
        </div>
      ) : (
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                External ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                License Plate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                City / Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Screens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              {canManage && (
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-zinc-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-zinc-900">{vehicle.name}</div>
                  {vehicle.makeModel && (
                    <div className="text-xs text-zinc-500">{vehicle.makeModel}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                  {vehicle.externalId || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                  {vehicle.licensePlate || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                  {[vehicle.city, vehicle.region].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleScreenClick(vehicle.id)}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    {vehicle.screensCount} screen{vehicle.screensCount !== 1 ? "s" : ""}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      vehicle.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {vehicle.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => setEditingVehicle(vehicle)}
                      className="text-cyan-600 hover:text-cyan-700 font-medium"
                    >
                      Edit
                    </button>
                    {vehicle.isActive && (
                      <button
                        onClick={() => handleDeactivate(vehicle)}
                        className="text-red-600 hover:text-red-700 font-medium"
                        disabled={deleteMutation.isPending}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showCreateModal && (
        <VehicleEditorModal
          mode="create"
          initialValues={{ 
            name: "",
            publisherOrgId: publisherOrgId 
          }}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}

      {editingVehicle && (
        <VehicleEditorModal
          mode="edit"
          vehicleId={editingVehicle.id}
          initialValues={{
            name: editingVehicle.name,
            publisherOrgId: editingVehicle.publisherOrgId,
            externalId: editingVehicle.externalId,
            licensePlate: editingVehicle.licensePlate,
            makeModel: editingVehicle.makeModel,
            city: editingVehicle.city,
            region: editingVehicle.region,
            isActive: editingVehicle.isActive,
          }}
          onClose={() => setEditingVehicle(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
