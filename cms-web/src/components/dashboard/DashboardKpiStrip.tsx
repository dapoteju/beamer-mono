import type { DashboardStats } from "../../api/dashboard";

interface KpiCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  isLoading: boolean;
  error: boolean;
}

function KpiCard({ label, value, subLabel, isLoading, error }: KpiCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6">
      <div className="text-sm font-medium text-zinc-500 mb-1">{label}</div>
      {isLoading ? (
        <div className="h-8 bg-zinc-200 rounded animate-pulse w-16 mb-1"></div>
      ) : error ? (
        <div className="text-sm text-red-500">Failed to load</div>
      ) : (
        <div className="text-3xl font-bold text-zinc-900">{value}</div>
      )}
      {subLabel && !isLoading && !error && (
        <div className="text-xs text-zinc-500 mt-1">{subLabel}</div>
      )}
    </div>
  );
}

interface DashboardKpiStripProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: boolean;
}

export default function DashboardKpiStrip({ stats, isLoading, error }: DashboardKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard
        label="Active Campaigns"
        value={stats?.activeCampaigns ?? 0}
        subLabel="campaigns currently live"
        isLoading={isLoading}
        error={error}
      />
      <KpiCard
        label="Active Screens"
        value={stats?.activeScreens ?? 0}
        subLabel="screens in active status"
        isLoading={isLoading}
        error={error}
      />
      <KpiCard
        label="Online Screens"
        value={stats ? `${stats.onlineScreens} / ${stats.totalScreens}` : "0 / 0"}
        subLabel="screens currently online"
        isLoading={isLoading}
        error={error}
      />
      <KpiCard
        label="Pending Approvals"
        value={stats?.pendingApprovals ?? 0}
        subLabel="awaiting review"
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
