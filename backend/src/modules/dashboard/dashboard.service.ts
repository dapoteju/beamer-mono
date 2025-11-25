import { db } from "../../db/client";
import { screens, players, heartbeats, campaigns, organisations } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getPendingApprovals } from "../creatives/creatives.service";

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

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export async function getDashboardSummary(offlineLimit = 10, approvalsLimit = 10): Promise<DashboardSummary> {
  const now = new Date();

  // Fetch all screens with their player info and latest heartbeat
  const allScreens = await db
    .select({
      id: screens.id,
      code: screens.code,
      name: screens.name,
      city: screens.city,
      regionCode: screens.regionCode,
      status: screens.status,
      publisherOrgId: screens.publisherOrgId,
      publisherOrgName: organisations.name,
      latitude: screens.latitude,
      longitude: screens.longitude,
      lastSeenAt: screens.lastSeenAt,
      playerId: players.id,
      lastHeartbeatAt: sql<Date | null>`(
        SELECT MAX(h.timestamp) 
        FROM ${heartbeats} h 
        WHERE h.player_id = ${players.id}
      )`,
    })
    .from(screens)
    .leftJoin(organisations, eq(screens.publisherOrgId, organisations.id))
    .leftJoin(players, eq(players.screenId, screens.id));

  // Process screens with online status
  const processedScreens: DashboardScreen[] = allScreens.map(screen => {
    const lastHeartbeatAt = screen.lastHeartbeatAt ? new Date(screen.lastHeartbeatAt) : null;
    const lastSeenAtDate = screen.lastSeenAt ? new Date(screen.lastSeenAt) : null;
    
    const isOnline = lastHeartbeatAt 
      ? now.getTime() - lastHeartbeatAt.getTime() < ONLINE_THRESHOLD_MS 
      : false;

    return {
      id: screen.id,
      code: screen.code,
      name: screen.name,
      city: screen.city,
      region: screen.regionCode,
      publisherOrgName: screen.publisherOrgName || "Unknown",
      latitude: screen.latitude ? parseFloat(screen.latitude) : null,
      longitude: screen.longitude ? parseFloat(screen.longitude) : null,
      lastHeartbeatAt: lastHeartbeatAt?.toISOString() || null,
      lastSeenAt: lastSeenAtDate?.toISOString() || null,
      isOnline,
    };
  });

  // Calculate stats
  const activeScreens = allScreens.filter(s => s.status === "active");
  const onlineScreens = processedScreens.filter(s => s.isOnline);

  // Fetch active campaigns count
  const activeCampaignsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaigns)
    .where(eq(campaigns.status, "active"));
  const activeCampaignsCount = Number(activeCampaignsResult[0]?.count || 0);

  // Fetch pending approvals
  const pendingApprovals = await getPendingApprovals("pending");
  
  // Sort approvals by oldest first
  const sortedApprovals = [...pendingApprovals].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Get offline screens for active screens only, sorted properly
  // Screens without heartbeats should appear at the END (least urgent since we have no data)
  const offlineActiveScreens = processedScreens
    .filter(s => {
      const originalScreen = allScreens.find(os => os.id === s.id);
      return !s.isOnline && originalScreen?.status === "active";
    })
    .sort((a, b) => {
      // Get the last known timestamp for each screen
      const aTime = a.lastHeartbeatAt 
        ? new Date(a.lastHeartbeatAt).getTime() 
        : (a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : null);
      const bTime = b.lastHeartbeatAt 
        ? new Date(b.lastHeartbeatAt).getTime() 
        : (b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : null);
      
      // Null timestamps go to the end
      if (aTime === null && bTime === null) return 0;
      if (aTime === null) return 1; // a goes after b
      if (bTime === null) return -1; // a goes before b
      
      // Sort by oldest first (lowest timestamp first = longest offline)
      return aTime - bTime;
    })
    .slice(0, offlineLimit);

  // Get screens with coordinates for map
  const mapScreens = processedScreens.filter(
    s => s.latitude !== null && s.longitude !== null
  );

  return {
    stats: {
      activeCampaigns: activeCampaignsCount,
      activeScreens: activeScreens.length,
      onlineScreens: onlineScreens.length,
      totalScreens: processedScreens.length,
      pendingApprovals: pendingApprovals.length,
    },
    offlineScreens: {
      items: offlineActiveScreens,
      generatedAt: now.toISOString(),
    },
    mapScreens: {
      items: mapScreens,
    },
    pendingApprovals: {
      items: sortedApprovals.slice(0, approvalsLimit),
      totalPending: pendingApprovals.length,
    },
  };
}
