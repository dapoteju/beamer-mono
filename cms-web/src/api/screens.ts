import apiClient from "./client";

export interface Screen {
  id: string;
  name: string;
  city: string;
  region: string;
  publisherOrgId: string;
  publisherOrgName: string;
  status: string;
  playerId: string | null;
  lastHeartbeatAt: string | null;
  isOnline: boolean;
}

export interface ScreenPlayer {
  id: string;
  lastSeenAt: string | null;
  softwareVersion: string | null;
  configHash: string | null;
  lastHeartbeatAt: string | null;
  isOnline: boolean;
}

export interface ScreenInfo {
  id: string;
  name: string;
  city: string;
  regionCode: string;
  status: string;
  publisherOrgId: string;
  publisherOrgName: string;
  screenType: string;
  resolutionWidth: number;
  resolutionHeight: number;
  lat: string;
  lng: string;
}

export interface ScreenStats {
  playCount24h: number;
  playCount7d: number;
}

export interface PlayEvent {
  timestamp: string;
  creativeId: string;
  creativeName: string | null;
  campaignId: string;
  campaignName: string | null;
  playStatus: string;
  durationSeconds?: number;
}

export interface ScreenDetail {
  screen: ScreenInfo;
  player: ScreenPlayer | null;
  stats: ScreenStats;
  recentPlayEvents: PlayEvent[];
}

export interface Heartbeat {
  timestamp: string;
  status: string;
  softwareVersion: string | null;
  storageFreeMb: number | null;
  cpuUsage: string | null;
  networkType: string | null;
  signalStrength: number | null;
}

export interface GetScreensParams {
  publisherOrgId?: string;
  region?: string;
  status?: string;
}

export interface GetHeartbeatsParams {
  from?: string;
  to?: string;
}

export interface GetPlayEventsParams {
  from?: string;
  to?: string;
  limit?: number;
}

export async function fetchScreens(params?: GetScreensParams): Promise<Screen[]> {
  const response = await apiClient.get<Screen[]>("/screens", { params });
  return response.data;
}

export async function fetchScreenDetail(id: string): Promise<ScreenDetail> {
  const response = await apiClient.get<ScreenDetail>(`/screens/${id}`);
  return response.data;
}

export async function fetchScreenHeartbeats(
  id: string,
  params?: GetHeartbeatsParams
): Promise<Heartbeat[]> {
  const response = await apiClient.get<Heartbeat[]>(`/screens/${id}/heartbeats`, { params });
  return response.data;
}

export async function fetchScreenPlayEvents(
  id: string,
  params?: GetPlayEventsParams
): Promise<PlayEvent[]> {
  const response = await apiClient.get<PlayEvent[]>(`/screens/${id}/play-events`, { params });
  return response.data;
}
