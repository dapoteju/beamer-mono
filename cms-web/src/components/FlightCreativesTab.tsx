import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFlightCreatives,
  updateFlightCreativeWeight,
  deleteFlightCreative,
  type FlightCreative,
} from "../api/flightCreatives";
import { FlightAddCreativesModal } from "./FlightAddCreativesModal";

interface FlightCreativesTabProps {
  flightId: string;
  campaignId: string;
}

export function FlightCreativesTab({ flightId, campaignId }: FlightCreativesTabProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<{ id: string; value: number } | null>(null);

  const {
    data: flightCreatives = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["flightCreatives", flightId],
    queryFn: () => fetchFlightCreatives(flightId),
  });

  const updateWeightMutation = useMutation({
    mutationFn: ({ flightCreativeId, weight }: { flightCreativeId: string; weight: number }) =>
      updateFlightCreativeWeight(flightId, flightCreativeId, weight),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flightCreatives", flightId] });
      setEditingWeight(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (flightCreativeId: string) => deleteFlightCreative(flightId, flightCreativeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flightCreatives", flightId] });
      setDeleteConfirm(null);
    },
  });

  function handleWeightChange(fc: FlightCreative, newValue: string) {
    const weight = parseInt(newValue) || 0;
    setEditingWeight({ id: fc.id, value: weight });
  }

  function handleWeightBlur(fc: FlightCreative) {
    if (editingWeight && editingWeight.id === fc.id && editingWeight.value !== fc.weight) {
      updateWeightMutation.mutate({ flightCreativeId: fc.id, weight: editingWeight.value });
    } else {
      setEditingWeight(null);
    }
  }

  function handleWeightKeyDown(e: React.KeyboardEvent, fc: FlightCreative) {
    if (e.key === "Enter") {
      handleWeightBlur(fc);
    } else if (e.key === "Escape") {
      setEditingWeight(null);
    }
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

  if (isLoading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-zinc-200 rounded w-1/4"></div>
          <div className="h-10 bg-zinc-200 rounded"></div>
          <div className="h-10 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Failed to load flight creatives
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Flight Creatives</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
        >
          Add Creatives from Campaign
        </button>
      </div>

      {flightCreatives.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-zinc-600">
          No creatives assigned to this flight yet. Add creatives from the campaign to get started.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Preview
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Weight
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {flightCreatives.map((fc) => (
                <tr key={fc.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    {fc.creative && (
                      <div className="w-16 h-12 rounded overflow-hidden bg-zinc-100">
                        {fc.creative.mimeType.startsWith("image/") ? (
                          <img
                            src={fc.creative.fileUrl}
                            alt={fc.creative.name}
                            className="w-full h-full object-cover"
                          />
                        ) : fc.creative.mimeType.startsWith("video/") ? (
                          <video
                            src={fc.creative.fileUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                            Media
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {fc.creative?.name || "Unknown"}
                    </div>
                    {fc.creative && (
                      <div className="text-xs text-zinc-500">
                        {fc.creative.width}x{fc.creative.height}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {fc.creative && (
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                          fc.creative.status
                        )}`}
                      >
                        {fc.creative.status.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {fc.creative?.durationSeconds}s
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={editingWeight?.id === fc.id ? editingWeight.value : fc.weight}
                      onChange={(e) => handleWeightChange(fc, e.target.value)}
                      onBlur={() => handleWeightBlur(fc)}
                      onKeyDown={(e) => handleWeightKeyDown(e, fc)}
                      className="w-20 px-2 py-1 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={updateWeightMutation.isPending}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteConfirm(fc.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                      disabled={deleteMutation.isPending}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <FlightAddCreativesModal
          flightId={flightId}
          campaignId={campaignId}
          existingCreativeIds={flightCreatives.map((fc) => fc.creativeId)}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ["flightCreatives", flightId] });
          }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
