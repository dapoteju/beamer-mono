import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createVehicle, updateVehicle, type CreateVehiclePayload, type UpdateVehiclePayload } from "../../api/vehicles";
import { getPublisherOptions, type PublisherOption } from "../../api/publishers";
import { useAuthStore } from "../../store/authStore";

interface VehicleEditorModalProps {
  mode: "create" | "edit";
  vehicleId?: string;
  initialValues?: {
    name: string;
    publisherOrgId: string;
    externalId?: string | null;
    licensePlate?: string | null;
    makeModel?: string | null;
    city?: string | null;
    region?: string | null;
    isActive?: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function VehicleEditorModal({
  mode,
  vehicleId,
  initialValues,
  onClose,
  onSuccess,
}: VehicleEditorModalProps) {
  const { user } = useAuthStore();
  const isInternal = user?.orgType === "beamer_internal";

  const [formData, setFormData] = useState({
    name: initialValues?.name || "",
    publisherOrgId: initialValues?.publisherOrgId || (user?.orgType === "publisher" ? user?.orgId : "") || "",
    externalId: initialValues?.externalId || "",
    licensePlate: initialValues?.licensePlate || "",
    makeModel: initialValues?.makeModel || "",
    city: initialValues?.city || "",
    region: initialValues?.region || "",
    isActive: initialValues?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: publisherOptions = [] } = useQuery<PublisherOption[]>({
    queryKey: ["publisherOptions"],
    queryFn: getPublisherOptions,
    enabled: isInternal,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateVehiclePayload) => createVehicle(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create vehicle";
      setErrors({ submit: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateVehiclePayload) => updateVehicle(vehicleId!, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update vehicle";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (isInternal && mode === "create" && !formData.publisherOrgId) {
      newErrors.publisherOrgId = "Publisher is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      const payload: CreateVehiclePayload = {
        name: formData.name.trim(),
        external_id: formData.externalId.trim() || undefined,
        license_plate: formData.licensePlate.trim() || undefined,
        make_model: formData.makeModel.trim() || undefined,
        city: formData.city.trim() || undefined,
        region: formData.region.trim() || undefined,
      };

      if (isInternal) {
        payload.publisher_org_id = formData.publisherOrgId;
      }

      createMutation.mutate(payload);
    } else {
      const payload: UpdateVehiclePayload = {
        name: formData.name.trim(),
        external_id: formData.externalId.trim() || null,
        license_plate: formData.licensePlate.trim() || null,
        make_model: formData.makeModel.trim() || null,
        city: formData.city.trim() || null,
        region: formData.region.trim() || null,
        is_active: formData.isActive,
      };

      updateMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">
            {mode === "create" ? "Add Vehicle" : "Edit Vehicle"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
            type="button"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-zinc-300"
              }`}
              placeholder="e.g., Taxi 0123"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {isInternal && mode === "create" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Publisher <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.publisherOrgId}
                onChange={(e) => setFormData({ ...formData, publisherOrgId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.publisherOrgId ? "border-red-500" : "border-zinc-300"
                }`}
              >
                <option value="">Select a publisher</option>
                {publisherOptions.map((publisher) => (
                  <option key={publisher.id} value={publisher.organisationId || publisher.id}>
                    {publisher.label}
                  </option>
                ))}
              </select>
              {errors.publisherOrgId && (
                <p className="text-red-500 text-sm mt-1">{errors.publisherOrgId}</p>
              )}
            </div>
          )}

          {!isInternal && mode === "create" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Publisher
              </label>
              <input
                type="text"
                value={user?.orgName || ""}
                disabled
                className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-zinc-100 text-zinc-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              External ID
            </label>
            <input
              type="text"
              value={formData.externalId}
              onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., TX-0123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              License Plate
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ABC-123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Make / Model
            </label>
            <input
              type="text"
              value={formData.makeModel}
              onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Toyota Corolla"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Lagos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Region
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., NG-LA"
              />
            </div>
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300 rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-zinc-700">
                Active
              </label>
            </div>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-zinc-700 bg-zinc-100 rounded-md hover:bg-zinc-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Add Vehicle"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
