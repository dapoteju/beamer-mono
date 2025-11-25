import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchCreatives, type Creative } from "../api/creatives";
import { setFlightCreatives, fetchFlightCreatives, type FlightCreativeInput } from "../api/flightCreatives";

interface FlightAddCreativesModalProps {
  flightId: string;
  campaignId: string;
  existingCreativeIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedCreative {
  creativeId: string;
  weight: number;
}

export function FlightAddCreativesModal({
  flightId,
  campaignId,
  existingCreativeIds,
  onClose,
  onSuccess,
}: FlightAddCreativesModalProps) {
  const [selectedCreatives, setSelectedCreatives] = useState<SelectedCreative[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: campaignCreatives = [], isLoading } = useQuery({
    queryKey: ["creatives", campaignId],
    queryFn: () => fetchCreatives(campaignId),
  });

  const { data: existingFlightCreatives = [] } = useQuery({
    queryKey: ["flightCreatives", flightId],
    queryFn: () => fetchFlightCreatives(flightId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const existingItems: FlightCreativeInput[] = existingFlightCreatives.map((fc) => ({
        creative_id: fc.creativeId,
        weight: fc.weight,
      }));

      const newItems: FlightCreativeInput[] = selectedCreatives.map((sc) => ({
        creative_id: sc.creativeId,
        weight: sc.weight,
      }));

      const allItems = [...existingItems, ...newItems];
      return setFlightCreatives(flightId, allItems);
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || "Failed to add creatives");
    },
  });

  function toggleCreative(creative: Creative) {
    setSelectedCreatives((prev) => {
      const existing = prev.find((sc) => sc.creativeId === creative.id);
      if (existing) {
        return prev.filter((sc) => sc.creativeId !== creative.id);
      }
      return [...prev, { creativeId: creative.id, weight: 100 }];
    });
  }

  function updateWeight(creativeId: string, weight: number) {
    setSelectedCreatives((prev) =>
      prev.map((sc) => (sc.creativeId === creativeId ? { ...sc, weight } : sc))
    );
  }

  function isSelected(creativeId: string): boolean {
    return selectedCreatives.some((sc) => sc.creativeId === creativeId);
  }

  function isAlreadyAssigned(creativeId: string): boolean {
    return existingCreativeIds.includes(creativeId);
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending_review":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  const availableCreatives = campaignCreatives.filter((c) => !isAlreadyAssigned(c.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Add Creatives from Campaign</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700"
            disabled={mutation.isPending}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-zinc-200 rounded"></div>
              <div className="h-16 bg-zinc-200 rounded"></div>
              <div className="h-16 bg-zinc-200 rounded"></div>
            </div>
          ) : availableCreatives.length === 0 ? (
            <div className="text-center text-zinc-600 py-8">
              {campaignCreatives.length === 0
                ? "No creatives in this campaign. Add creatives to the campaign first."
                : "All campaign creatives are already assigned to this flight."}
            </div>
          ) : (
            <div className="space-y-3">
              {availableCreatives.map((creative) => {
                const selected = isSelected(creative.id);
                const selectedItem = selectedCreatives.find((sc) => sc.creativeId === creative.id);

                return (
                  <div
                    key={creative.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selected ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCreative(creative)}
                        className="h-4 w-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                      />

                      <div className="w-16 h-12 rounded overflow-hidden bg-zinc-100 flex-shrink-0">
                        {creative.mime_type.startsWith("image/") ? (
                          <img
                            src={creative.file_url}
                            alt={creative.name}
                            className="w-full h-full object-cover"
                          />
                        ) : creative.mime_type.startsWith("video/") ? (
                          <video
                            src={creative.file_url}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                            Media
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 truncate">
                          {creative.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">
                            {creative.width}x{creative.height} | {creative.duration_seconds}s
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeColor(
                              creative.status
                            )}`}
                          >
                            {creative.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-zinc-600">Weight:</label>
                          <input
                            type="number"
                            min="1"
                            value={selectedItem?.weight || 100}
                            onChange={(e) =>
                              updateWeight(creative.id, parseInt(e.target.value) || 100)
                            }
                            className="w-20 px-2 py-1 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
            disabled={mutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
            disabled={mutation.isPending || selectedCreatives.length === 0}
          >
            {mutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Adding...
              </span>
            ) : (
              `Add ${selectedCreatives.length} Creative${selectedCreatives.length !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
