import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchOrganisations, type Organisation } from "../api/organisations";

export default function Organisations() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOrganisations() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchOrganisations();
        setOrganisations(data);
      } catch (err: any) {
        console.error("Failed to fetch organisations:", err);
        setError(
          err.response?.data?.error || "Failed to load organisations. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganisations();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600">Loading organisations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-semibold">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Organisations</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Manage all advertisers, publishers, and internal organisations.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Billing Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {organisations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-zinc-500">
                  No organisations found.
                </td>
              </tr>
            ) : (
              organisations.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => navigate(`/organisations/${org.id}`)}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-zinc-900">
                      {org.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getOrgTypeBadgeColor(
                        org.type
                      )}`}
                    >
                      {formatOrgType(org.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {org.country}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {org.billing_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {formatDate(org.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
