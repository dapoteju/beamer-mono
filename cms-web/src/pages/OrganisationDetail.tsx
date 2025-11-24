import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchOrganisationById, type OrganisationDetail } from "../api/organisations";

export default function OrganisationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organisation, setOrganisation] = useState<OrganisationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "screens" | "campaigns">("overview");

  useEffect(() => {
    async function loadOrganisation() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await fetchOrganisationById(id);
        setOrganisation(data);
      } catch (err: any) {
        console.error("Failed to fetch organisation:", err);
        setError(
          err.response?.data?.error || "Failed to load organisation details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganisation();
  }, [id]);

  const getOrgTypeBadgeColor = (type: string) => {
    switch (type) {
      case "beamer_internal":
        return "bg-cyan-100 text-cyan-700";
      case "advertiser":
        return "bg-green-100 text-green-700";
      case "publisher":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatOrgType = (type: string) => {
    switch (type) {
      case "beamer_internal":
        return "Internal";
      case "advertiser":
        return "Advertiser";
      case "publisher":
        return "Publisher";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600">Loading organisation details...</div>
      </div>
    );
  }

  if (error || !organisation) {
    return (
      <div>
        <button
          onClick={() => navigate("/organisations")}
          className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          ← Back to Organisations
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error || "Organisation not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/organisations")}
        className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        ← Back to Organisations
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-zinc-900">{organisation.name}</h1>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${getOrgTypeBadgeColor(
              organisation.type
            )}`}
          >
            {formatOrgType(organisation.type)}
          </span>
        </div>
        <p className="text-sm text-zinc-600">
          Organisation ID: {organisation.id}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-lg font-semibold text-zinc-900">Overview</h2>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Type
            </p>
            <p className="mt-1 text-sm text-zinc-900">{formatOrgType(organisation.type)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Country
            </p>
            <p className="mt-1 text-sm text-zinc-900">{organisation.country}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Billing Email
            </p>
            <p className="mt-1 text-sm text-zinc-900">{organisation.billing_email}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Created At
            </p>
            <p className="mt-1 text-sm text-zinc-900">{formatDate(organisation.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "overview"
                  ? "border-cyan-500 text-cyan-600"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
              }`}
            >
              Overview
            </button>
            {organisation.screens.length > 0 && (
              <button
                onClick={() => setActiveTab("screens")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "screens"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                Screens ({organisation.screens.length})
              </button>
            )}
            {organisation.campaigns.length > 0 && (
              <button
                onClick={() => setActiveTab("campaigns")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "campaigns"
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                Campaigns ({organisation.campaigns.length})
              </button>
            )}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 mb-2">Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Total Screens</p>
                    <p className="text-2xl font-semibold text-zinc-900 mt-1">
                      {organisation.screens.length}
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Total Campaigns</p>
                    <p className="text-2xl font-semibold text-zinc-900 mt-1">
                      {organisation.campaigns.length}
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-4">
                    <p className="text-xs text-zinc-500">Total Bookings</p>
                    <p className="text-2xl font-semibold text-zinc-900 mt-1">
                      {organisation.bookings.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "screens" && (
            <div>
              {organisation.screens.length === 0 ? (
                <p className="text-sm text-zinc-500">No screens found for this organisation.</p>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        City
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Region
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {organisation.screens.map((screen) => (
                      <tr key={screen.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 text-sm text-zinc-900">{screen.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{screen.screen_type}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{screen.city}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">{screen.region_code}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              screen.status === "active"
                                ? "bg-green-100 text-green-700"
                                : screen.status === "inactive"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {screen.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "campaigns" && (
            <div>
              {organisation.campaigns.length === 0 ? (
                <p className="text-sm text-zinc-500">No campaigns found for this organisation.</p>
              ) : (
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Start Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        End Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Budget
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {organisation.campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 text-sm text-zinc-900">{campaign.name}</td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {formatDate(campaign.start_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {formatDate(campaign.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {formatCurrency(campaign.total_budget, campaign.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              campaign.status === "active"
                                ? "bg-green-100 text-green-700"
                                : campaign.status === "paused"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
