import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  CreateScreenPayload,
  UpdateScreenPayload,
  Region,
  Publisher,
  Player,
  VehicleOption,
} from "../api/screens";
import { fetchRegions, fetchPublishers, fetchPlayers, fetchVehicles, createScreen, updateScreen } from "../api/screens";
import { useAuthStore } from "../store/authStore";

interface ScreenFormModalProps {
  mode: "create" | "edit";
  screenId?: string;
  initialValues?: {
    name: string;
    city: string;
    regionCode: string;
    publisherOrgId: string;
    status: string;
    playerId: string | null;
    screenClassification?: "vehicle" | "billboard" | "indoor" | "other";
    vehicleId?: string | null;
    structureType?: string | null;
    sizeDescription?: string | null;
    illuminationType?: string | null;
    address?: string | null;
    venueName?: string | null;
    venueType?: string | null;
    venueAddress?: string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function ScreenFormModal({ mode, screenId, initialValues, onClose, onSuccess }: ScreenFormModalProps) {
  const { user } = useAuthStore();
  const isInternal = user?.orgType === "beamer_internal";

  const [formData, setFormData] = useState({
    name: initialValues?.name || "",
    city: initialValues?.city || "",
    regionCode: initialValues?.regionCode || "",
    publisherOrgId: initialValues?.publisherOrgId || "",
    status: initialValues?.status || "active",
    playerId: initialValues?.playerId || "",
    screenClassification: (initialValues?.screenClassification || "vehicle") as "vehicle" | "billboard" | "indoor" | "other",
    vehicleId: initialValues?.vehicleId || "",
    structureType: initialValues?.structureType || "",
    sizeDescription: initialValues?.sizeDescription || "",
    illuminationType: initialValues?.illuminationType || "",
    address: initialValues?.address || "",
    venueName: initialValues?.venueName || "",
    venueType: initialValues?.venueType || "",
    venueAddress: initialValues?.venueAddress || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch dropdown data
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const { data: publishers = [] } = useQuery<Publisher[]>({
    queryKey: ["publishers"],
    queryFn: fetchPublishers,
    enabled: isInternal,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: fetchPlayers,
  });

  const { data: vehicles = [] } = useQuery<VehicleOption[]>({
    queryKey: ["vehicles"],
    queryFn: fetchVehicles,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateScreenPayload) => createScreen(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create screen";
      setErrors({ submit: message });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateScreenPayload) => updateScreen(screenId!, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update screen";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.regionCode) newErrors.regionCode = "Region is required";
    if (!formData.publisherOrgId) newErrors.publisherOrgId = "Publisher is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      const payload: CreateScreenPayload = {
        name: formData.name,
        city: formData.city,
        regionCode: formData.regionCode,
        publisherOrgId: formData.publisherOrgId,
        status: formData.status as any,
        playerId: formData.playerId || undefined,
        screenClassification: formData.screenClassification,
        vehicleId: formData.vehicleId || undefined,
        structureType: formData.structureType || undefined,
        sizeDescription: formData.sizeDescription || undefined,
        illuminationType: formData.illuminationType || undefined,
        address: formData.address || undefined,
        venueName: formData.venueName || undefined,
        venueType: formData.venueType || undefined,
        venueAddress: formData.venueAddress || undefined,
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateScreenPayload = {
        name: formData.name,
        city: formData.city,
        regionCode: formData.regionCode,
        status: formData.status as any,
        screenClassification: formData.screenClassification,
        vehicleId: formData.vehicleId || undefined,
        structureType: formData.structureType || undefined,
        sizeDescription: formData.sizeDescription || undefined,
        illuminationType: formData.illuminationType || undefined,
        address: formData.address || undefined,
        venueName: formData.venueName || undefined,
        venueType: formData.venueType || undefined,
        venueAddress: formData.venueAddress || undefined,
      };

      // Only include publisherOrgId if user is internal and it changed
      if (isInternal && formData.publisherOrgId !== initialValues?.publisherOrgId) {
        payload.publisherOrgId = formData.publisherOrgId;
      }

      // Handle player assignment
      if (formData.playerId !== initialValues?.playerId) {
        payload.playerId = formData.playerId || null;
      }

      updateMutation.mutate(payload);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Get available players for dropdown (show current + unassigned)
  const availablePlayers = players.filter(
    (p) => !p.currentScreenId || p.currentScreenId === screenId
  );

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
            {mode === "create" ? "Create Screen" : "Edit Screen"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
            type="button"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
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
              placeholder="e.g., Screen Lagos Central"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.city ? "border-red-500" : "border-zinc-300"
              }`}
              placeholder="e.g., Lagos"
            />
            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Region <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.regionCode}
              onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.regionCode ? "border-red-500" : "border-zinc-300"
              }`}
            >
              <option value="">Select a region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.code}>
                  {region.name} ({region.code})
                </option>
              ))}
            </select>
            {errors.regionCode && <p className="text-red-500 text-sm mt-1">{errors.regionCode}</p>}
          </div>

          {/* Publisher (internal only, or disabled for edit if publisher) */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Publisher <span className="text-red-500">*</span>
            </label>
            {isInternal ? (
              <select
                value={formData.publisherOrgId}
                onChange={(e) => setFormData({ ...formData, publisherOrgId: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.publisherOrgId ? "border-red-500" : "border-zinc-300"
                }`}
              >
                <option value="">Select a publisher</option>
                {publishers.map((publisher) => (
                  <option key={publisher.id} value={publisher.id}>
                    {publisher.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={user?.orgName || ""}
                disabled
                className="w-full px-3 py-2 border border-zinc-300 rounded-md bg-zinc-100 text-zinc-600"
              />
            )}
            {errors.publisherOrgId && <p className="text-red-500 text-sm mt-1">{errors.publisherOrgId}</p>}
          </div>

          {/* Screen Classification */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Screen Type</label>
            <select
              value={formData.screenClassification}
              onChange={(e) => setFormData({ ...formData, screenClassification: e.target.value as any })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="vehicle">Vehicle</option>
              <option value="billboard">Billboard</option>
              <option value="indoor">Indoor</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Vehicle Section (only show if classification is vehicle) */}
          {formData.screenClassification === "vehicle" && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Vehicle Details</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Vehicle</label>
                <select
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">No vehicle assigned</option>
                  {vehicles.map((vehicle) => {
                    const label = [
                      vehicle.licencePlate,
                      vehicle.make,
                      vehicle.model,
                      vehicle.publisherOrgName && `[${vehicle.publisherOrgName}]`,
                    ].filter(Boolean).join(" • ");
                    return (
                      <option key={vehicle.id} value={vehicle.id}>
                        {label || vehicle.id}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Billboard Section (only show if classification is billboard) */}
          {formData.screenClassification === "billboard" && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">Billboard Details</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Structure Type</label>
                <input
                  type="text"
                  value={formData.structureType}
                  onChange={(e) => setFormData({ ...formData, structureType: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Digital Billboard, Static Poster"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Size Description</label>
                <input
                  type="text"
                  value={formData.sizeDescription}
                  onChange={(e) => setFormData({ ...formData, sizeDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., 48ft x 14ft"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Illumination Type</label>
                <input
                  type="text"
                  value={formData.illuminationType}
                  onChange={(e) => setFormData({ ...formData, illuminationType: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., LED Backlit, Non-illuminated"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Airport Approach Road, Ikeja"
                />
              </div>
            </div>
          )}

          {/* Indoor Section (only show if classification is indoor) */}
          {formData.screenClassification === "indoor" && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900">Indoor / Venue Details</h3>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Venue Name</label>
                <input
                  type="text"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., The Palms Shopping Mall"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Venue Type</label>
                <input
                  type="text"
                  value={formData.venueType}
                  onChange={(e) => setFormData({ ...formData, venueType: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Shopping Center - Food Court"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Venue Address</label>
                <input
                  type="text"
                  value={formData.venueAddress}
                  onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g., Bisway St, Lekki Phase 1"
                />
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Player Assignment */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Player</label>
            <select
              value={formData.playerId}
              onChange={(e) => setFormData({ ...formData, playerId: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {availablePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.id}
                  {player.currentScreenName && ` (currently on: ${player.currentScreenName})`}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Only unassigned players or the currently assigned player are shown
            </p>
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
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
                ? "Create Screen"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
