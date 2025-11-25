import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCreative, type Creative } from "../../api/creatives";
import { CreativeFormModal } from "../CreativeFormModal";
import type { DashboardApproval } from "../../api/dashboard";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PendingApprovalsWidgetProps {
  approvals: DashboardApproval[];
  isLoading: boolean;
  error: boolean;
  onRefetch: () => void;
}

export default function PendingApprovalsWidget({
  approvals,
  isLoading,
  error,
  onRefetch,
}: PendingApprovalsWidgetProps) {
  const navigate = useNavigate();
  const [selectedCreative, setSelectedCreative] = useState<{ id: string; campaignId: string } | null>(null);
  const [creativeForModal, setCreativeForModal] = useState<Creative | null>(null);
  const [loadingCreative, setLoadingCreative] = useState(false);

  const handleReview = async (approval: DashboardApproval) => {
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
    onRefetch();
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Pending Compliance Approvals</h2>
        <button
          onClick={() => navigate("/compliance")}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all
        </button>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-500 text-sm mb-3">Failed to load pending approvals</p>
          <button
            onClick={onRefetch}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : approvals.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-zinc-600">No pending approvals</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Creative
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Region
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {approvals.map((approval) => (
                <tr key={approval.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">{approval.creative_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/campaigns/${approval.campaign_id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {approval.campaign_name}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {approval.region_code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-500">{formatDate(approval.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
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
