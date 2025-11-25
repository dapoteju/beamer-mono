import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchPendingApprovals, fetchCreative, type PendingApproval, type Creative } from "../api/creatives";
import { CreativeFormModal } from "../components/CreativeFormModal";

export default function CompliancePendingApprovals() {
  const navigate = useNavigate();
  const [selectedCreative, setSelectedCreative] = useState<{ id: string; campaignId: string } | null>(null);
  const [creativeForModal, setCreativeForModal] = useState<Creative | null>(null);
  const [loadingCreative, setLoadingCreative] = useState(false);

  const {
    data: approvals = [],
    isLoading,
    error,
    refetch,
  } = useQuery<PendingApproval[]>({
    queryKey: ["pending-approvals"],
    queryFn: () => fetchPendingApprovals("pending"),
  });

  const handleReview = async (approval: PendingApproval) => {
    setLoadingCreative(true);
    setSelectedCreative({
      id: approval.creative_id,
      campaignId: approval.campaign_id,
    });
    
    try {
      const creative = await fetchCreative(approval.creative_id);
      setCreativeForModal(creative);
    } catch (error) {
      console.error("Failed to fetch creative:", error);
      setSelectedCreative(null);
    } finally {
      setLoadingCreative(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCreative(null);
    setCreativeForModal(null);
    refetch();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
      }
      return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading pending approvals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 mb-4">Failed to load pending approvals</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Compliance</h1>
        <p className="text-zinc-600 mt-1">Review pending creative approvals across all campaigns</p>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">No pending approvals</h2>
          <p className="text-zinc-600">All creative approvals are up to date.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <p className="text-sm text-zinc-600">
              {approvals.length} pending approval{approvals.length === 1 ? "" : "s"}
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Creative
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Advertiser
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {approvals.map((approval) => (
                <tr key={approval.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {approval.region_code}
                      </span>
                      <span className="text-sm text-zinc-900">{approval.region_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-zinc-900">{approval.creative_name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{approval.creative_id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/campaigns/${approval.campaign_id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {approval.campaign_name}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-900">{approval.advertiser_org_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-zinc-500">{formatDate(approval.created_at)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleReview(approval)}
                      disabled={loadingCreative && selectedCreative?.id === approval.creative_id}
                      className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-wait transition-colors"
                    >
                      {loadingCreative && selectedCreative?.id === approval.creative_id ? "Loading..." : "Review"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCreative && creativeForModal && (
        <CreativeFormModal
          mode="edit"
          campaignId={selectedCreative.campaignId}
          creative={creativeForModal}
          onClose={handleCloseModal}
          onSuccess={handleCloseModal}
        />
      )}
    </div>
  );
}
