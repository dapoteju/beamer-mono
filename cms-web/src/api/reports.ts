import apiClient from "./client";

export interface CampaignReport {
  campaign_id: string;
  campaign_name: string;
  total_play_events: number;
  impressions_delivered: number;
  impressions_by_region: Array<{ region: string; impressions: number }>;
  impressions_by_flight: Array<{
    flight_id: string;
    flight_name: string;
    impressions: number;
  }>;
  compliance_status: Array<{
    region: string;
    resolved_status: string;
    statuses: Array<{ status: string; count: number }>;
  }>;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  status: string;
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
