import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCreatives,
  deleteCreative,
  type Creative,
} from "../../api/creatives";
import { CreativeFormModal } from "../../components/CreativeFormModal";

interface CampaignCreativesTabProps {
  campaignId: string;
}

export default function CampaignCreativesTab({ campaignId }: CampaignCreativesTabProps) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewCreative, setPreviewCreative] = useState<Creative | null>(null);

  const {
    data: creatives = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["creatives", campaignId],
    queryFn: () => fetchCreatives(campaignId),
    enabled: !!campaignId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCreative,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatives", campaignId] });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to delete creative");
      setDeleteConfirmId(null);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["creatives", campaignId] });
  };

  const getStatusBadgeColor = (status: string): string => {
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
  };

  const formatStatus = (status: string): string => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderPreview = (creative: Creative) => {
    const content = creative.mime_type.startsWith("image/") ? (
      <img
        src={creative.file_url}
        alt={creative.name}
        className="w-16 h-12 object-cover rounded"
      />
    ) : creative.mime_type.startsWith("video/") ? (
      <video
        src={creative.file_url}
        className="w-16 h-12 object-cover rounded"
        muted
        playsInline
      />
    ) : (
      <div className="w-16 h-12 bg-zinc-200 rounded flex items-center justify-center">
        <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );

    return (
      <button
        type="button"
        onClick={() => setPreviewCreative(creative)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Click to preview"
      >
        {content}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-48 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
          Loading creatives...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Failed to load creatives. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Creatives</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Upload Creative
        </button>
      </div>

      {creatives.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-zinc-600 mb-4">
            No creatives added yet for this campaign.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Upload Creative
          </button>
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
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Dimensions
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Regions
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {creatives.map((creative) => (
                <tr key={creative.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    {renderPreview(creative)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                    {creative.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {creative.duration_seconds}s
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {creative.width && creative.height
                      ? `${creative.width} x ${creative.height}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                        creative.status
                      )}`}
                    >
                      {formatStatus(creative.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {creative.regions_required && creative.regions_required.length > 0
                      ? creative.regions_required.join(", ")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingCreative(creative)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(creative.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <CreativeFormModal
          mode="create"
          campaignId={campaignId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleRefresh}
        />
      )}

      {editingCreative && (
        <CreativeFormModal
          mode="edit"
          campaignId={campaignId}
          creative={editingCreative}
          onClose={() => setEditingCreative(null)}
          onSuccess={handleRefresh}
        />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">
              Delete Creative
            </h3>
            <p className="text-zinc-600 mb-6">
              Are you sure you want to delete this creative? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-zinc-300"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewCreative && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setPreviewCreative(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewCreative(null)}
              className="absolute -top-10 right-0 text-white hover:text-zinc-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-zinc-700">
                <h3 className="text-white font-medium">{previewCreative.name}</h3>
                <p className="text-zinc-400 text-sm">
                  {previewCreative.width} x {previewCreative.height} | {previewCreative.duration_seconds}s
                </p>
              </div>
              <div className="flex items-center justify-center p-4 bg-zinc-800">
                {previewCreative.mime_type.startsWith("image/") ? (
                  <img
                    src={previewCreative.file_url}
                    alt={previewCreative.name}
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                ) : previewCreative.mime_type.startsWith("video/") ? (
                  <video
                    src={previewCreative.file_url}
                    className="max-w-full max-h-[70vh] rounded"
                    controls
                    autoPlay
                  />
                ) : (
                  <div className="text-zinc-400 py-12">Preview not available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
