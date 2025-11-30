import { type CampaignWithStats } from "../../api/campaigns";
import { type CampaignTab } from "../../hooks/useUrlSyncedTab";
import TargetingDetails from "../../components/TargetingDetails";

interface CampaignOverviewTabProps {
  campaign: CampaignWithStats;
  onNavigateToTab: (tab: CampaignTab) => void;
}

export default function CampaignOverviewTab({ campaign, onNavigateToTab }: CampaignOverviewTabProps) {
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

  const activeFlights = campaign.flights.filter(f => f.status === "active").length;
  const scheduledFlights = campaign.flights.filter(f => f.status === "scheduled").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase">Impressions</div>
              <div className="text-xl font-semibold text-zinc-900">
                {(campaign.stats?.totalImpressions ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase">Budget</div>
              <div className="text-xl font-semibold text-zinc-900">
                {formatCurrency(campaign.totalBudget, campaign.currency)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase">Flights</div>
              <div className="text-xl font-semibold text-zinc-900">
                {campaign.flights.length}
                {activeFlights > 0 && (
                  <span className="text-sm font-normal text-green-600 ml-2">
                    ({activeFlights} active)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase">Status</div>
              <div className="text-xl font-semibold text-zinc-900 capitalize">
                {scheduledFlights > 0 && (
                  <span className="text-sm font-normal text-purple-600">
                    {scheduledFlights} scheduled
                  </span>
                )}
                {scheduledFlights === 0 && campaign.status}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Campaign Details</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Campaign ID:</dt>
              <dd className="text-sm text-zinc-900 font-mono">{campaign.id}</dd>
            </div>
            <div className="flex">
              <dt className="w-48 text-sm font-medium text-zinc-700">Advertiser:</dt>
              <dd className="text-sm text-zinc-900">
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

        <div className="bg-white border border-zinc-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigateToTab("flights")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors text-left"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-zinc-900 text-sm">Add Flight</div>
                <div className="text-xs text-zinc-500">Create a new flight for this campaign</div>
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab("creatives")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors text-left"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-zinc-900 text-sm">Upload Creative</div>
                <div className="text-xs text-zinc-500">Add media assets to this campaign</div>
              </div>
            </button>

            <button
              onClick={() => onNavigateToTab("reporting")}
              className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors text-left"
            >
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-zinc-900 text-sm">View Reports</div>
                <div className="text-xs text-zinc-500">See campaign performance data</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
