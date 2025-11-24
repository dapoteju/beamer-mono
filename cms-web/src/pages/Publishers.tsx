import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPublishers, type PublisherProfile } from "../api/publishers";
import { useAuthStore } from "../store/authStore";
import PublisherFormModal from "../components/PublisherFormModal";

export default function Publishers() {
  const [publishers, setPublishers] = useState<PublisherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  async function loadPublishers() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPublishers();
      setPublishers(data);
    } catch (err: any) {
      console.error("Failed to fetch publishers:", err);
      setError(
        err.response?.data?.error || "Failed to load publishers. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublishers();
  }, []);

  const getTypeBadgeColor = (type: string) => {
    return type === "organisational"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-blue-700";
  };

  const formatType = (type: string) => {
    return type === "organisational" ? "Organisational" : "Individual";
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
        <div className="text-zinc-600">Loading publishers...</div>
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

  const canCreate = user?.orgType === "beamer_internal" && (user?.role === "admin" || user?.role === "ops");

  function handleCreateSuccess() {
    loadPublishers();
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Publishers</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Manage publisher profiles and screen inventory owners.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
          >
            + Create Publisher
          </button>
        )}
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
                Screens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Organisation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200">
            {publishers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-500">
                  No publishers found.
                </td>
              </tr>
            ) : (
              publishers.map((pub) => (
                <tr
                  key={pub.id}
                  onClick={() => navigate(`/publishers/${pub.id}`)}
                  className="hover:bg-zinc-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-zinc-900">
                      {pub.publisherType === "organisational"
                        ? pub.organisationName || "—"
                        : pub.fullName || "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getTypeBadgeColor(
                        pub.publisherType
                      )}`}
                    >
                      {formatType(pub.publisherType)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {pub.screenCount || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {pub.phoneNumber || pub.email || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {pub.organisationName || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                    {formatDate(pub.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateModalOpen && (
        <PublisherFormModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
