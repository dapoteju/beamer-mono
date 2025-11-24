import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchCampaignDetail,
  updateCampaignStatus,
  type CampaignWithStats,
  type CampaignStatus,
} from "../api/campaigns";
import { fetchBookings, type Booking } from "../api/bookings";
import { CampaignFormModal } from "../components/CampaignFormModal";
import { FlightFormModal } from "../components/FlightFormModal";
import BookingFormModal from "../components/BookingFormModal";
import TargetingDetails from "../components/TargetingDetails";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<CampaignWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"overview" | "flights" | "bookings">("overview");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [editingFlightId, setEditingFlightId] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", id],
    queryFn: () => fetchBookings(id),
    enabled: !!id,
  });

  async function loadCampaign() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchCampaignDetail(id);
      setCampaign(data);
    } catch (err: any) {
      console.error("Failed to fetch campaign:", err);
      setError(
        err.response?.data?.error || "Failed to load campaign. Please try again."
      );

      if (err.response?.status === 403 || err.response?.status === 404) {
        setTimeout(() => navigate("/campaigns"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const updateStatusMutation = useMutation({
    mutationFn: (status: CampaignStatus) => updateCampaignStatus(id!, status),
    onSuccess: () => {
      loadCampaign();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to update status");
    },
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

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

  function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  function handleAddFlight() {
    setEditingFlightId(null);
    setShowFlightModal(true);
  }

  function handleEditFlight(flightId: string) {
    setEditingFlightId(flightId);
    setShowFlightModal(true);
  }

  function handleEditBooking(booking: Booking) {
    setEditingBooking(booking);
    setShowBookingModal(true);
  }

  function handleAddBooking() {
    setEditingBooking(null);
    setShowBookingModal(true);
  }

  function getBillingModelLabel(model: string): string {
    switch (model) {
      case "fixed":
        return "Fixed";
      case "cpm":
        return "CPM";
      case "cpd":
        return "CPD";
      case "share_of_loop":
        return "Share of Loop";
      default:
        return model;
    }
  }

  function getBookingStatusBadgeColor(status: string): string {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-zinc-600">Loading campaign...</div>
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

  if (!campaign) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        Campaign not found
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate("/campaigns")}
          className="text-sm text-zinc-600 hover:text-zinc-900 mb-2"
        >
          ← Back to Campaigns
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{campaign.name}</h1>
            {campaign.objective && (
              <p className="text-sm text-zinc-600 mt-1">{campaign.objective}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/reporting/campaigns?campaignId=${id}`)}
              className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-md text-sm hover:bg-zinc-200 transition-colors"
            >
              View Report
            </button>
            <select
              value={campaign.status}
              onChange={(e) =>
                updateStatusMutation.mutate(e.target.value as CampaignStatus)
              }
              disabled={updateStatusMutation.isPending}
              className={`px-3 py-1.5 text-sm font-medium rounded border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${getStatusBadgeColor(
                campaign.status
              )}`}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Edit Campaign
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Budget</div>
            <div className="text-lg font-semibold text-zinc-900 mt-1">
              {formatCurrency(campaign.totalBudget, campaign.currency)}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Duration</div>
            <div className="text-sm font-medium text-zinc-900 mt-1">
              {formatDate(campaign.startDate)}
            </div>
            <div className="text-sm text-zinc-600">to {formatDate(campaign.endDate)}</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">Flights</div>
            <div className="text-lg font-semibold text-zinc-900 mt-1">
              {campaign.flights.length}
            </div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-lg p-4">
            <div className="text-xs font-medium text-zinc-500 uppercase">
              Total Impressions
            </div>
            <div className="text-lg font-semibold text-zinc-900 mt-1">
              {(campaign.stats?.totalImpressions ?? 0).toLocaleString()}
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
            onClick={() => setActiveTab("flights")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "flights"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Flights ({campaign.flights.length})
          </button>
          <button
            onClick={() => setActiveTab("bookings")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "bookings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Bookings
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Campaign Details</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Campaign ID:</dt>
              <dd className="text-sm text-zinc-900 font-mono">{campaign.id}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Advertiser Org ID:</dt>
              <dd className="text-sm text-zinc-900 font-mono">
                {campaign.advertiserOrgName || campaign.advertiserOrgId}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Start Date:</dt>
              <dd className="text-sm text-zinc-900">{formatDate(campaign.startDate)}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">End Date:</dt>
              <dd className="text-sm text-zinc-900">{formatDate(campaign.endDate)}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Total Budget:</dt>
              <dd className="text-sm text-zinc-900">
                {formatCurrency(campaign.totalBudget, campaign.currency)}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Created At:</dt>
              <dd className="text-sm text-zinc-900">{formatDateTime(campaign.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-zinc-700 mb-2">Targeting:</dt>
              <dd>
                <TargetingDetails targetingJson={campaign.targetingJson} />
              </dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === "flights" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Flights</h2>
            <button
              onClick={handleAddFlight}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Add Flight
            </button>
          </div>

          {campaign.flights.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-zinc-600">
              No flights created yet. Add your first flight to get started.
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Flight Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Start
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      End
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Target Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Target ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {campaign.flights.map((flight) => (
                    <tr key={flight.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {flight.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                            flight.status
                          )}`}
                        >
                          {flight.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {formatDateTime(flight.startDatetime)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {formatDateTime(flight.endDatetime)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {flight.targetType}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700 font-mono">
                        {flight.targetId}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditFlight(flight.id)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "bookings" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-900">Bookings</h3>
            <button
              onClick={handleAddBooking}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Add Booking
            </button>
          </div>

          {bookings.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
              <p className="text-zinc-600 mb-4">
                No bookings have been added for this campaign yet.
              </p>
              <button
                onClick={handleAddBooking}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Booking
              </button>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Billing Model
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Rate
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Start Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      End Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                        {getBillingModelLabel(booking.billingModel)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {formatCurrency(booking.rate, booking.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {formatDate(booking.startDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-700">
                        {formatDate(booking.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded ${getBookingStatusBadgeColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditBooking(booking)}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <CampaignFormModal
          mode="edit"
          campaignId={campaign.id}
          initialValues={{
            name: campaign.name,
            objective: campaign.objective || "",
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            totalBudget: campaign.totalBudget,
            currency: campaign.currency,
            status: campaign.status,
            targetingJson: campaign.targetingJson,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadCampaign();
          }}
        />
      )}

      {showFlightModal && (
        <FlightFormModal
          campaignId={campaign.id}
          flightId={editingFlightId || undefined}
          onClose={() => {
            setShowFlightModal(false);
            setEditingFlightId(null);
          }}
          onSuccess={() => {
            setShowFlightModal(false);
            setEditingFlightId(null);
            loadCampaign();
          }}
        />
      )}

      {showBookingModal && (
        <BookingFormModal
          isOpen={showBookingModal}
          campaignId={campaign.id}
          advertiserOrgId={campaign.advertiserOrgId}
          booking={editingBooking}
          onClose={() => {
            setShowBookingModal(false);
            setEditingBooking(null);
          }}
        />
      )}
    </div>
  );
}
