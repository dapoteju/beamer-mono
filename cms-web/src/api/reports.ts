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
