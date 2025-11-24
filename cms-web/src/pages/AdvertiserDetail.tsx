import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAdvertiserById, deleteAdvertiser, type AdvertiserDetail } from "../api/advertisers";
import { useAuthStore } from "../store/authStore";
import AdvertiserFormModal from "../components/AdvertiserFormModal";

export default function AdvertiserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [advertiser, setAdvertiser] = useState<AdvertiserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  async function loadAdvertiser() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdvertiserById(id);
      setAdvertiser(data);
    } catch (err: any) {
      console.error("Failed to fetch advertiser:", err);
      setError(
        err.response?.data?.error || "Failed to load advertiser details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdvertiser();
  }, [id]);

  async function handleDelete() {
    if (!id || !confirm("Are you sure you want to delete this advertiser?")) return;

    try {
      await deleteAdvertiser(id);
      navigate("/advertisers");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete advertiser");
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
        <div className="text-zinc-600">Loading advertiser details...</div>
      </div>
    );
  }

  if (error || !advertiser) {
    return (
      <div>
        <button
          onClick={() => navigate("/advertisers")}
          className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          ← Back to Advertisers
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error || "Advertiser not found"}</p>
        </div>
      </div>
    );
  }

  const canEdit = user?.orgType === "beamer_internal" && (user?.role === "admin" || user?.role === "ops");

  return (
    <div>
      <button
        onClick={() => navigate("/advertisers")}
        className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        ← Back to Advertisers
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{advertiser.name}</h1>
          <p className="text-sm text-zinc-600">Advertiser ID: {advertiser.id}</p>
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

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
        </div>
        <div className="px-6 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</p>
            <p className="mt-1 text-sm text-zinc-900">{advertiser.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Country</p>
            <p className="mt-1 text-sm text-zinc-900">{advertiser.country}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Billing Email</p>
            <p className="mt-1 text-sm text-zinc-900">{advertiser.billingEmail}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Campaigns</p>
            <p className="mt-1 text-sm text-zinc-900">{advertiser.campaignCount}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Created At</p>
            <p className="mt-1 text-sm text-zinc-900">{formatDate(advertiser.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Updated At</p>
            <p className="mt-1 text-sm text-zinc-900">{formatDate(advertiser.updatedAt)}</p>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <AdvertiserFormModal
          mode="edit"
          advertiserId={advertiser.id}
          advertiser={advertiser}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            loadAdvertiser();
          }}
        />
      )}
    </div>
  );
}
