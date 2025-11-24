import apiClient from "./client";

export interface CampaignReport {
  campaignId: string;
  startDate: string;
  endDate: string;
  totalImpressions: number;
  byScreen: Array<{ screenId: string; screenName?: string; impressions: number }>;
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
