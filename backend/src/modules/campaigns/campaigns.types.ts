export interface CampaignResponse {
  id: string;
  advertiserOrgId: string;
  name: string;
  objective?: string | null;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: "draft" | "active" | "paused" | "completed";
  targetingJson?: any;
  createdAt: Date;
}

export interface CampaignWithStatsResponse extends CampaignResponse {
  flights: FlightResponse[];
  stats: {
    totalImpressions: number;
  };
}

export interface FlightResponse {
  id: string;
  campaignId: string;
  defaultBookingId?: string | null;
  name: string;
  startDatetime: Date;
  endDatetime: Date;
  targetType: string;
  targetId: string;
  maxImpressions?: number | null;
  status: "scheduled" | "active" | "paused" | "completed";
}

export interface BookingResponse {
  id: string;
  advertiserOrgId: string;
  campaignId: string;
  startDate: string;
  endDate: string;
  currency: string;
  billingModel: "fixed" | "cpm" | "cpd" | "share_of_loop";
  rate: number;
  agreedImpressions?: number | null;
  agreedAmountMinor?: number | null;
  status: "pending" | "active" | "completed" | "cancelled";
  createdAt: Date;
}
