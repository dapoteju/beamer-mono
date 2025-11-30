import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCampaigns, type Campaign } from "../api/campaigns";
import { useAuthStore } from "../store/authStore";

export default function Campaigns() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchCampaigns({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setCampaigns(data || []);
    } catch (err: any) {
      console.error("Failed to fetch campaigns:", err);
      setError(
        err.response?.data?.error || "Failed to load campaigns. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadCampaigns();
  }

  function handleRowClick(campaignId: string) {
    navigate(`/campaigns/${campaignId}`);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading && campaigns.length === 0) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading campaigns...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Campaigns</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage advertising campaigns and flights
          </p>
        </div>
        <button
          onClick={() => navigate("/campaigns/new")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          New Campaign
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-zinc-200">
          <div className="flex gap-4">
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search campaigns..."
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            No campaigns found. Create your first campaign to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Campaign Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Status
                  </th>
                  {user?.orgType === "beamer_internal" && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                      Advertiser
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Budget
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-zinc-200">
                {campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    onClick={() => handleRowClick(campaign.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">
                        {campaign.name}
                      </div>
                      {campaign.objective && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {campaign.objective}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    {user?.orgType === "beamer_internal" && (
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {campaign.advertiserOrgName || campaign.advertiserOrgId}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {formatDate(campaign.startDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {formatDate(campaign.endDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {formatCurrency(campaign.totalBudget, campaign.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
