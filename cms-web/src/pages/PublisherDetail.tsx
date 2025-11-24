import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPublisherById, deletePublisher, type PublisherProfileDetail } from "../api/publishers";
import { useAuthStore } from "../store/authStore";
import PublisherFormModal from "../components/PublisherFormModal";

export default function PublisherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [publisher, setPublisher] = useState<PublisherProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  async function loadPublisher() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchPublisherById(id);
      setPublisher(data);
    } catch (err: any) {
      console.error("Failed to fetch publisher:", err);
      setError(
        err.response?.data?.error || "Failed to load publisher details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublisher();
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Are you sure you want to delete this publisher?")) return;

    try {
      await deletePublisher(id);
      navigate("/publishers");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete publisher");
    }
  }

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
        <div className="text-zinc-600">Loading publisher details...</div>
      </div>
    );
  }

  if (error || !publisher) {
    return (
      <div>
        <button
          onClick={() => navigate("/publishers")}
          className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          ← Back to Publishers
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error || "Publisher not found"}</p>
        </div>
      </div>
    );
  }

  const canEdit = user?.orgType === "beamer_internal" && (user?.role === "admin" || user?.role === "ops");

  return (
    <div>
      <button
        onClick={() => navigate("/publishers")}
        className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        ← Back to Publishers
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {publisher.publisherType === "organisational"
                ? publisher.organisationName || "Organisational Publisher"
                : publisher.fullName || "Individual Publisher"}
            </h1>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              publisher.publisherType === "organisational"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {publisher.publisherType === "organisational" ? "Organisational" : "Individual"}
            </span>
          </div>
          <p className="text-sm text-zinc-600">Publisher ID: {publisher.id}</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</p>
            <p className="mt-1 text-sm text-zinc-900">
              {publisher.publisherType === "organisational" ? "Organisational" : "Individual"}
            </p>
          </div>
          {publisher.organisationName && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Organisation</p>
              <p className="mt-1 text-sm text-zinc-900">{publisher.organisationName}</p>
            </div>
          )}
          {publisher.fullName && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name</p>
              <p className="mt-1 text-sm text-zinc-900">{publisher.fullName}</p>
            </div>
          )}
          {publisher.phoneNumber && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Phone</p>
              <p className="mt-1 text-sm text-zinc-900">{publisher.phoneNumber}</p>
            </div>
          )}
          {publisher.email && (
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</p>
              <p className="mt-1 text-sm text-zinc-900">{publisher.email}</p>
            </div>
          )}
          {publisher.address && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Address</p>
              <p className="mt-1 text-sm text-zinc-900">{publisher.address}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Screens</p>
            <p className="mt-1 text-sm text-zinc-900">{publisher.screenCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Vehicles</p>
            <p className="mt-1 text-sm text-zinc-900">{publisher.vehicleCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Created At</p>
            <p className="mt-1 text-sm text-zinc-900">{formatDate(publisher.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Updated At</p>
            <p className="mt-1 text-sm text-zinc-900">{formatDate(publisher.updatedAt)}</p>
          </div>
        </div>
      </div>

      {publisher.notes && (
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h2 className="text-lg font-semibold text-zinc-900">Notes</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-zinc-700 whitespace-pre-wrap">{publisher.notes}</p>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <PublisherFormModal
          mode="edit"
          publisherId={publisher.id}
          publisher={publisher}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            loadPublisher();
          }}
        />
      )}
    </div>
  );
}
