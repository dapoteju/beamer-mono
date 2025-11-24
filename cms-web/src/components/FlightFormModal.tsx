import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createFlight,
  updateFlight,
  fetchCampaignDetail,
  type CreateFlightPayload,
  type UpdateFlightPayload,
  type FlightStatus,
} from "../api/campaigns";

interface FlightFormModalProps {
  campaignId: string;
  flightId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FlightFormModal({
  campaignId,
  flightId,
  onClose,
  onSuccess,
}: FlightFormModalProps) {
  const mode = flightId ? "edit" : "create";

  const [formData, setFormData] = useState({
    name: "",
    startDatetime: "",
    endDatetime: "",
    targetType: "screen" as "screen" | "screen_group",
    targetId: "",
    status: "scheduled" as FlightStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flightId) {
      loadFlightData();
    }
  }, [flightId]);

  async function loadFlightData() {
    try {
      setLoading(true);
      const campaign = await fetchCampaignDetail(campaignId);
      const flight = campaign.flights.find((f) => f.id === flightId);
      if (flight) {
        setFormData({
          name: flight.name,
          startDatetime: flight.startDatetime,
          endDatetime: flight.endDatetime,
          targetType: flight.targetType,
          targetId: flight.targetId,
          status: flight.status,
        });
      }
    } catch (err) {
      console.error("Failed to load flight:", err);
    } finally {
      setLoading(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateFlightPayload) =>
      createFlight(campaignId, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create flight";
      setErrors({ submit: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateFlightPayload) =>
      updateFlight(flightId!, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update flight";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Flight name is required";
    if (!formData.startDatetime) newErrors.startDatetime = "Start date/time is required";
    if (!formData.endDatetime) newErrors.endDatetime = "End date/time is required";
    if (!formData.targetId.trim()) newErrors.targetId = "Target ID is required";

    if (formData.startDatetime && formData.endDatetime) {
      if (new Date(formData.startDatetime) >= new Date(formData.endDatetime)) {
        newErrors.endDatetime = "End date/time must be after start date/time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      const payload: CreateFlightPayload = {
        name: formData.name.trim(),
        startDatetime: formData.startDatetime,
        endDatetime: formData.endDatetime,
        targetType: formData.targetType,
        targetId: formData.targetId.trim(),
        status: formData.status,
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateFlightPayload = {
        name: formData.name.trim(),
        startDatetime: formData.startDatetime,
        endDatetime: formData.endDatetime,
        targetType: formData.targetType,
        targetId: formData.targetId.trim(),
        status: formData.status,
      };
      updateMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {mode === "create" ? "Add Flight" : "Edit Flight"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-zinc-600">Loading flight data...</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {errors.submit}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Flight Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-500" : "border-zinc-300"
                }`}
                placeholder="e.g., Lagos Evening Flight"
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDatetime}
                  onChange={(e) =>
                    setFormData({ ...formData, startDatetime: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.startDatetime ? "border-red-500" : "border-zinc-300"
                  }`}
                />
                {errors.startDatetime && (
                  <p className="text-xs text-red-600 mt-1">{errors.startDatetime}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDatetime}
                  onChange={(e) =>
                    setFormData({ ...formData, endDatetime: e.target.value })
                  }
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.endDatetime ? "border-red-500" : "border-zinc-300"
                  }`}
                />
                {errors.endDatetime && (
                  <p className="text-xs text-red-600 mt-1">{errors.endDatetime}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Target Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.targetType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    targetType: e.target.value as "screen" | "screen_group",
                  })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="screen">Screen</option>
                <option value="screen_group">Screen Group</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Target ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.targetId}
                onChange={(e) =>
                  setFormData({ ...formData, targetId: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.targetId ? "border-red-500" : "border-zinc-300"
                }`}
                placeholder="Enter screen ID or screen group ID"
              />
              {errors.targetId && (
                <p className="text-xs text-red-600 mt-1">{errors.targetId}</p>
              )}
              <p className="text-xs text-zinc-500 mt-1">
                Enter the ID of the screen or screen group to target
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as FlightStatus })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-200">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPending
                  ? mode === "create"
                    ? "Creating..."
                    : "Saving..."
                  : mode === "create"
                  ? "Create Flight"
                  : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
