import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  fetchFlightById,
  fetchCampaignDetail,
  updateFlightStatus,
  type Flight,
  type FlightStatus,
  type CampaignWithStats,
} from "../api/campaigns";
import { FlightFormModal } from "../components/FlightFormModal";
import { FlightCreativesTab } from "../components/FlightCreativesTab";

export default function FlightDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [campaign, setCampaign] = useState<CampaignWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "creatives">("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  async function loadFlight() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const flightData = await fetchFlightById(id);
      setFlight(flightData);

      const campaignData = await fetchCampaignDetail(flightData.campaignId);
      setCampaign(campaignData);
    } catch (err: any) {
      console.error("Failed to fetch flight:", err);
      setError(
        err.response?.data?.error || "Failed to load flight. Please try again."
      );

      if (err.response?.status === 403 || err.response?.status === 404) {
        setTimeout(() => navigate("/campaigns"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlight();
  }, [id]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: FlightStatus) => updateFlightStatus(id!, status),
    onSuccess: () => {
      loadFlight();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to update status");
    },
  });

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading flight...</div>
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

  if (!flight || !campaign) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        Flight not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate(`/campaigns/${campaign.id}`)}
          className="text-sm text-zinc-600 hover:text-zinc-900 mb-2"
        >
          ← Back to {campaign.name}
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{flight.name}</h1>
            <p className="text-sm text-zinc-600 mt-1">
              Flight for campaign: {campaign.name}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={flight.status}
              onChange={(e) =>
                updateStatusMutation.mutate(e.target.value as FlightStatus)
              }
              disabled={updateStatusMutation.isPending}
              className={`px-3 py-1.5 text-sm font-medium rounded border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusBadgeColor(
                flight.status
              )}`}
            >
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Edit Flight
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Start</div>
            <div className="text-sm font-medium text-zinc-900 mt-1">
              {formatDateTime(flight.startDatetime)}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">End</div>
            <div className="text-sm font-medium text-zinc-900 mt-1">
              {formatDateTime(flight.endDatetime)}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Target Type</div>
            <div className="text-sm font-medium text-zinc-900 mt-1 capitalize">
              {flight.targetType.replace("_", " ")}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Target ID</div>
            <div className="text-sm font-mono text-zinc-900 mt-1 truncate" title={flight.targetId}>
              {flight.targetId}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("creatives")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "creatives"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Creatives
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Flight Details</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Flight ID:</dt>
              <dd className="text-sm text-zinc-900 font-mono">{flight.id}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Campaign:</dt>
              <dd className="text-sm text-zinc-900">{campaign.name}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Status:</dt>
              <dd>
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                    flight.status
                  )}`}
                >
                  {flight.status}
                </span>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Start Date:</dt>
              <dd className="text-sm text-zinc-900">{formatDateTime(flight.startDatetime)}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">End Date:</dt>
              <dd className="text-sm text-zinc-900">{formatDateTime(flight.endDatetime)}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Target Type:</dt>
              <dd className="text-sm text-zinc-900 capitalize">
                {flight.targetType.replace("_", " ")}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Target ID:</dt>
              <dd className="text-sm text-zinc-900 font-mono">{flight.targetId}</dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === "creatives" && (
        <FlightCreativesTab flightId={flight.id} campaignId={campaign.id} />
      )}

      {showEditModal && (
        <FlightFormModal
          campaignId={campaign.id}
          flightId={flight.id}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadFlight();
          }}
        />
      )}
    </div>
  );
}
