import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFlight,
  updateFlight,
  fetchFlightById,
  type CreateFlightPayload,
  type UpdateFlightPayload,
  type FlightStatus,
} from "../../api/campaigns";
import { fetchScreens } from "../../api/screens";
import { fetchScreenGroups } from "../../api/screenGroups";
import { SheetHeader, SheetTitle, SheetClose } from "../ui/Sheet";
import { TargetingPreviewWarnings } from "../TargetingPreviewWarnings";
import FlightCreativesSectionComponent from "./FlightCreativesSection";

interface FlightEditorDrawerProps {
  campaignId: string;
  flightId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FlightEditorDrawer({
  campaignId,
  flightId,
  onClose,
  onSuccess,
}: FlightEditorDrawerProps) {
  const mode = flightId ? "edit" : "create";
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    startDatetime: "",
    endDatetime: "",
    targetType: "screen" as "screen" | "screen_group",
    targetId: "",
    status: "scheduled" as FlightStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<"details" | "creatives">("details");

  const { data: flight, isLoading: flightLoading } = useQuery({
    queryKey: ["flight", flightId],
    queryFn: () => fetchFlightById(flightId!),
    enabled: !!flightId,
  });

  const { data: screens = [], isLoading: screensLoading } = useQuery({
    queryKey: ["screens"],
    queryFn: () => fetchScreens(),
  });

  const { data: screenGroupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["screenGroups", { archived: false }],
    queryFn: () => fetchScreenGroups({ archived: false }),
  });

  const screenGroups = screenGroupsData?.items || [];

  useEffect(() => {
    if (flight && mode === "edit") {
      setFormData({
        name: flight.name,
        startDatetime: flight.startDatetime.slice(0, 16),
        endDatetime: flight.endDatetime.slice(0, 16),
        targetType: flight.targetType,
        targetId: flight.targetId,
        status: flight.status,
      });
    }
  }, [flight, mode]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateFlightPayload) =>
      createFlight(campaignId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      onSuccess();
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
      queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["flight", flightId] });
      onSuccess();
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
    if (!formData.targetId.trim()) newErrors.targetId = "Target is required";

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

    const payload = {
      name: formData.name.trim(),
      startDatetime: formData.startDatetime,
      endDatetime: formData.endDatetime,
      targetType: formData.targetType,
      targetId: formData.targetId.trim(),
      status: formData.status,
    };

    if (mode === "create") {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (flightLoading && mode === "edit") {
    return (
      <div className="h-full flex flex-col">
        <SheetHeader className="flex items-center justify-between">
          <SheetTitle>Loading Flight...</SheetTitle>
          <SheetClose onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <SheetHeader className="flex items-center justify-between">
        <SheetTitle>{mode === "create" ? "Add Flight" : "Edit Flight"}</SheetTitle>
        <SheetClose onClose={onClose} />
      </SheetHeader>

      {mode === "edit" && (
        <div className="border-b border-zinc-200 px-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveSection("details")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === "details"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Details & Targeting
            </button>
            <button
              onClick={() => setActiveSection("creatives")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === "creatives"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Creatives
            </button>
          </nav>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === "details" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
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

            <div className="border-t border-zinc-200 pt-6">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Targeting</h3>

              <div className="space-y-4">
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
                        targetId: "",
                      })
                    }
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="screen">Single Screen</option>
                    <option value="screen_group">Screen Group</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    {formData.targetType === "screen" ? "Select Screen" : "Select Screen Group"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  {formData.targetType === "screen" ? (
                    <select
                      value={formData.targetId}
                      onChange={(e) =>
                        setFormData({ ...formData, targetId: e.target.value })
                      }
                      disabled={screensLoading}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.targetId ? "border-red-500" : "border-zinc-300"
                      }`}
                    >
                      <option value="">
                        {screensLoading ? "Loading screens..." : "Select a screen"}
                      </option>
                      {screens.map((screen) => (
                        <option key={screen.id} value={screen.id}>
                          {screen.code} - {screen.name || screen.city} ({screen.publisherOrgName})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formData.targetId}
                      onChange={(e) =>
                        setFormData({ ...formData, targetId: e.target.value })
                      }
                      disabled={groupsLoading}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.targetId ? "border-red-500" : "border-zinc-300"
                      }`}
                    >
                      <option value="">
                        {groupsLoading ? "Loading screen groups..." : "Select a screen group"}
                      </option>
                      {screenGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.screenCount} screens) - {group.publisherName}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.targetId && (
                    <p className="text-xs text-red-600 mt-1">{errors.targetId}</p>
                  )}
                </div>

                {formData.targetType === "screen_group" && formData.targetId && (
                  <TargetingPreviewWarnings 
                    groupIds={[formData.targetId]} 
                    className="mt-4"
                  />
                )}
              </div>
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
        ) : (
          <FlightCreativesSectionComponent
            flightId={flightId!}
            campaignId={campaignId}
          />
        )}
      </div>
    </div>
  );
}
