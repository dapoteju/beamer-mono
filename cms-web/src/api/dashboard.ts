import apiClient from "./client";

export interface DashboardStats {
  activeCampaigns: number;
  activeScreens: number;
  onlineScreens: number;
  totalScreens: number;
  pendingApprovals: number;
}

export interface DashboardScreen {
  id: string;
  code: string;
  name: string | null;
  city: string;
  region: string;
  publisherOrgName: string;
  latitude: number | null;
  longitude: number | null;
  lastHeartbeatAt: string | null;
  lastSeenAt: string | null;
  isOnline: boolean;
}

export interface DashboardApproval {
  id: string;
  region_code: string;
  region_name: string;
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_org_name: string;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  stats: DashboardStats;
  offlineScreens: {
    items: DashboardScreen[];
    generatedAt: string;
  };
  mapScreens: {
    items: DashboardScreen[];
  };
  pendingApprovals: {
    items: DashboardApproval[];
    totalPending: number;
  };
}

const defaultDashboardSummary: DashboardSummary = {
  stats: {
    activeCampaigns: 0,
    activeScreens: 0,
    onlineScreens: 0,
    totalScreens: 0,
    pendingApprovals: 0,
  },
  offlineScreens: { items: [], generatedAt: new Date().toISOString() },
  mapScreens: { items: [] },
  pendingApprovals: { items: [], totalPending: 0 },
};

export async function fetchDashboardSummary(
  offlineLimit = 10,
  approvalsLimit = 10
): Promise<DashboardSummary> {
  try {
    const params = new URLSearchParams();
    params.append("offlineLimit", offlineLimit.toString());
    params.append("approvalsLimit", approvalsLimit.toString());

    const response = await apiClient.get(`/dashboard/summary?${params.toString()}`);
    return response.data?.data || defaultDashboardSummary;
  } catch (error) {
    return defaultDashboardSummary;
  }
}
