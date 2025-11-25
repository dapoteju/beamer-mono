import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { fetchDashboardSummary, type DashboardSummary } from "../api/dashboard";
import DashboardKpiStrip from "../components/dashboard/DashboardKpiStrip";
import PendingApprovalsWidget from "../components/dashboard/PendingApprovalsWidget";
import OfflineScreensWidget from "../components/dashboard/OfflineScreensWidget";
import NetworkMiniMapCard from "../components/dashboard/NetworkMiniMapCard";
import DashboardQuickLinks from "../components/dashboard/DashboardQuickLinks";

function InternalDashboard() {
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: () => fetchDashboardSummary(10, 10),
    refetchInterval: 60000,
  });

  const hasError = !!error;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Network Operations Dashboard</h1>
        <p className="text-zinc-600 mt-1">Overview of your Beamer network performance</p>
      </div>

      <DashboardKpiStrip 
        stats={summary?.stats ?? null} 
        isLoading={isLoading} 
        error={hasError} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <PendingApprovalsWidget 
            approvals={summary?.pendingApprovals.items ?? []}
            isLoading={isLoading}
            error={hasError}
            onRefetch={refetch}
          />
          <OfflineScreensWidget 
            screens={summary?.offlineScreens.items ?? []}
            isLoading={isLoading}
            error={hasError}
            onRefetch={refetch}
          />
        </div>
        <div>
          <NetworkMiniMapCard 
            screens={summary?.mapScreens.items ?? []}
            isLoading={isLoading}
            error={hasError}
          />
        </div>
      </div>

      <DashboardQuickLinks />
    </div>
  );
}

function AdvertiserDashboard() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Coming Soon</h2>
        <p className="text-zinc-600">
          Dashboard features for advertisers are being developed.
          In the meantime, check out your campaigns.
        </p>
        <a
          href="/campaigns"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          View Campaigns
        </a>
      </div>
    </div>
  );
}

function PublisherDashboard() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Dashboard</h1>
      <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto">
        <div className="text-5xl mb-4">📺</div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Coming Soon</h2>
        <p className="text-zinc-600">
          Dashboard features for publishers are being developed.
          In the meantime, check out your screens.
        </p>
        <a
          href="/screens"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          View Screens
        </a>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

  if (user?.orgType === "beamer_internal") {
    return <InternalDashboard />;
  }

  if (user?.orgType === "advertiser") {
    return <AdvertiserDashboard />;
  }

  if (user?.orgType === "publisher") {
    return <PublisherDashboard />;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="text-sm text-zinc-600">
        Welcome to Beamer CMS.
      </p>
    </div>
  );
}
