import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFlightCreatives,
  addCreativeToFlight,
  deleteFlightCreative,
} from "../../api/flightCreatives";
import { fetchCreatives } from "../../api/creatives";

interface FlightCreativesSectionProps {
  flightId: string;
  campaignId: string;
}

export default function FlightCreativesSection({ flightId, campaignId }: FlightCreativesSectionProps) {
  const queryClient = useQueryClient();
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    data: flightCreatives = [],
    isLoading: loadingFlightCreatives,
  } = useQuery({
    queryKey: ["flightCreatives", flightId],
    queryFn: () => fetchFlightCreatives(flightId),
    enabled: !!flightId,
  });

  const {
    data: campaignCreatives = [],
    isLoading: loadingCampaignCreatives,
  } = useQuery({
    queryKey: ["creatives", campaignId],
    queryFn: () => fetchCreatives(campaignId),
    enabled: !!campaignId,
  });

  const addMutation = useMutation({
    mutationFn: (creativeId: string) => addCreativeToFlight(flightId, creativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flightCreatives", flightId] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to add creative");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (flightCreativeId: string) => deleteFlightCreative(flightId, flightCreativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flightCreatives", flightId] });
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to remove creative");
    },
  });

  const attachedCreativeIds = new Set(flightCreatives.map(fc => fc.creativeId));
  const availableCreatives = campaignCreatives.filter(c => !attachedCreativeIds.has(c.id));

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

  if (loadingFlightCreatives) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Attached Creatives</h3>
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showAddPanel ? "Close" : "Attach Creative"}
        </button>
      </div>

      {showAddPanel && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-zinc-700 mb-3">
            Available Creatives from Campaign
          </h4>
          {loadingCampaignCreatives ? (
            <div className="text-sm text-zinc-500">Loading...</div>
          ) : availableCreatives.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No more creatives available to attach. Upload new creatives in the Creatives tab.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableCreatives.map((creative) => (
                <div
                  key={creative.id}
                  className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-9 rounded overflow-hidden bg-zinc-100 flex-shrink-0">
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
                          File
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{creative.name}</div>
                      <div className="text-xs text-zinc-500">
                        {creative.width}x{creative.height} | {creative.duration_seconds}s
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => addMutation.mutate(creative.id)}
                    disabled={addMutation.isPending}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addMutation.isPending ? "Adding..." : "Attach"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {flightCreatives.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-8 text-center">
          <div className="mx-auto w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-600">
            No creatives attached to this flight yet.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Attach creatives from the campaign to run them on this flight.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {flightCreatives.map((fc) => (
            <div
              key={fc.id}
              className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-10 rounded overflow-hidden bg-zinc-100 flex-shrink-0">
                  {fc.creative?.mimeType.startsWith("image/") ? (
                    <img
                      src={fc.creative.fileUrl}
                      alt={fc.creative.name}
                      className="w-full h-full object-cover"
                    />
                  ) : fc.creative?.mimeType.startsWith("video/") ? (
                    <video
                      src={fc.creative.fileUrl}
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                      File
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-zinc-900">
                    {fc.creative?.name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">
                      {fc.creative?.width}x{fc.creative?.height}
                    </span>
                    <span className="text-xs text-zinc-400">|</span>
                    <span className="text-xs text-zinc-500">
                      {fc.creative?.durationSeconds}s
                    </span>
                    {fc.creative?.status && (
                      <>
                        <span className="text-xs text-zinc-400">|</span>
                        <span
                          className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusBadgeColor(
                            fc.creative.status
                          )}`}
                        >
                          {fc.creative.status.replace("_", " ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(fc.id)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Remove Creative</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Are you sure you want to remove this creative from the flight?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
