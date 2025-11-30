import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCampaignDetail,
  updateCampaignStatus,
  type CampaignStatus,
} from "../../api/campaigns";
import { useUrlSyncedTab, type CampaignTab } from "../../hooks/useUrlSyncedTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/Tabs";
import { CampaignFormModal } from "../../components/CampaignFormModal";
import CampaignOverviewTab from "./CampaignOverviewTab";
import CampaignFlightsTab from "./CampaignFlightsTab";
import CampaignCreativesTabPage from "./CampaignCreativesTab";
import CampaignReportingTabPage from "./CampaignReportingTab";

export default function CampaignWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useUrlSyncedTab("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  const {
    data: campaign,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => fetchCampaignDetail(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: CampaignStatus) => updateCampaignStatus(id!, status),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
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

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading campaign...
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || "Failed to load campaign";
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {errorMessage}
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
    <div className="flex flex-col gap-4">
      <div>
        <button
          onClick={() => navigate("/campaigns")}
          className="text-sm text-zinc-600 hover:text-zinc-900 mb-2 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Campaigns
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{campaign.name}</h1>
            {campaign.objective && (
              <p className="text-sm text-zinc-600 mt-1">{campaign.objective}</p>
            )}
          </div>
          <div className="flex gap-2">
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
            <div className="text-xs font-medium text-zinc-500 uppercase">Total Impressions</div>
            <div className="text-lg font-semibold text-zinc-900 mt-1">
              {(campaign.stats?.totalImpressions ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => setActiveTab(tab as CampaignTab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="flights">Flights ({campaign.flights.length})</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CampaignOverviewTab 
            campaign={campaign} 
            onNavigateToTab={setActiveTab}
          />
        </TabsContent>

        <TabsContent value="flights">
          <CampaignFlightsTab 
            campaignId={campaign.id} 
            flights={campaign.flights}
            onFlightChange={refetch}
          />
        </TabsContent>

        <TabsContent value="creatives">
          <CampaignCreativesTabPage campaignId={campaign.id} />
        </TabsContent>

        <TabsContent value="reporting">
          <CampaignReportingTabPage campaignId={campaign.id} />
        </TabsContent>
      </Tabs>

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
            refetch();
          }}
        />
      )}
    </div>
  );
}
