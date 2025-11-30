import apiClient from "./client";

export interface CampaignReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  byScreen: Array<{ 
    screenId: string; 
    screenName?: string; 
    screenType?: string;
    screenClassification?: string;
    publisherName?: string;
    publisherType?: string;
    impressions: number;
  }>;
  byDay: Array<{ date: string; impressions: number }>;
}

export interface CampaignReportParams {
  campaignId: string;
  startDate?: string;
  endDate?: string;
}

export async function getCampaignReport(
  params: CampaignReportParams
): Promise<CampaignReport> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  const response = await apiClient.get(
    `/reports/campaigns/${params.campaignId}?${queryParams.toString()}`
  );
  return response.data.data;
}

export interface CampaignMobilityReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  screens: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    screenClassification?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    points: Array<{
      lat: number;
      lng: number;
      recordedAt: string;
    }>;
  }>;
}

export async function getCampaignMobilityReport(
  params: CampaignReportParams
): Promise<CampaignMobilityReport> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  const response = await apiClient.get(
    `/reports/campaigns/${params.campaignId}/mobility?${queryParams.toString()}`
  );
  return response.data.data;
}

export interface CampaignExposureReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  totalExposureLocations: number;
  points: Array<{
    lat: number;
    lng: number;
    impressions: number;
  }>;
  byScreen: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    impressions: number;
    exposureLocations: number;
  }>;
}

export async function getCampaignExposureReport(
  params: CampaignReportParams
): Promise<CampaignExposureReport> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  const response = await apiClient.get(
    `/reports/campaigns/${params.campaignId}/exposure?${queryParams.toString()}`
  );
  return response.data.data;
}

export type ComplianceScreenStatus = "OK" | "NO_DELIVERY" | "OFFLINE";

export interface CampaignComplianceReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  summary: {
    totalScreensScheduled: number;
    screensWithImpressions: number;
    screensWithZeroImpressions: number;
    screensWithoutHeartbeats: number;
    totalImpressions: number;
    activeDays: number;
    daysWithImpressions: number;
    daysWithHeartbeats: number;
  };
  byDay: Array<{
    date: string;
    impressions: number;
    hasActiveFlight: boolean;
    scheduledScreens: number;
    activeScreens: number;
    offlineScreens: number;
  }>;
  byScreen: Array<{
    screenId: string;
    screenName?: string | null;
    screenType?: string | null;
    publisherName?: string | null;
    publisherType?: string | null;
    impressions: number;
    hasHeartbeats: boolean;
    firstImpressionAt?: string | null;
    lastImpressionAt?: string | null;
    status: ComplianceScreenStatus;
  }>;
}

export async function getCampaignComplianceReport(
  params: CampaignReportParams
): Promise<CampaignComplianceReport> {
  const queryParams = new URLSearchParams();
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  const response = await apiClient.get(
    `/reports/campaigns/${params.campaignId}/compliance?${queryParams.toString()}`
  );
  return response.data.data;
}

export interface CampaignDiagnosticsReport {
  screens_offline: Array<{
    screen_id: string;
    name: string | null;
    last_seen_at: string | null;
    publisher_name: string | null;
  }>;
  screens_targeted_but_no_plays: Array<{
    screen_id: string;
    name: string | null;
    flight_id: string;
    flight_name: string;
  }>;
  creatives_with_no_plays: Array<{
    creative_id: string;
    name: string;
    flight_id: string;
    flight_name: string;
  }>;
  missing_approvals: Array<{
    creative_id: string;
    name: string;
    region: string;
    required: boolean;
  }>;
  resolution_mismatches: Array<{
    screen_id: string;
    screen_resolution: string;
    creative_id: string;
    creative_resolution: string;
  }>;
}

export async function getCampaignDiagnosticsReport(
  campaignId: string
): Promise<CampaignDiagnosticsReport> {
  const response = await apiClient.get(
    `/reports/campaigns/${campaignId}/diagnostics`
  );
  return response.data.data;
}
