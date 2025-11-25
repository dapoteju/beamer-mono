import apiClient from "./client";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type FlightStatus = "scheduled" | "active" | "paused" | "completed";
export type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled";

export interface Campaign {
  id: string;
  advertiserOrgId: string;
  advertiserOrgName?: string | null;
  name: string;
  objective?: string | null;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status: CampaignStatus;
  targetingJson?: any;
  createdAt: string;
}

export interface Flight {
  id: string;
  campaignId: string;
  name: string;
  startDatetime: string;
  endDatetime: string;
  targetType: "screen" | "screen_group";
  targetId: string;
  status: FlightStatus;
  createdAt: string;
}

export interface CampaignWithStats extends Campaign {
  flights: Flight[];
  stats: {
    totalImpressions: number;
  };
}

export interface Booking {
  id: string;
  advertiserOrgId: string;
  advertiserOrgName?: string | null;
  campaignId: string;
  campaignName?: string | null;
  currency: string;
  billingModel: "cpm" | "flat_fee" | "revenue_share";
  rate: number;
  agreedImpressions?: number | null;
  agreedAmountMinor?: number | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt: string;
}

export interface CreateCampaignPayload {
  advertiserOrgId?: string;
  name: string;
  objective?: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  currency: string;
  status?: CampaignStatus;
  targetingJson?: any;
}

export interface UpdateCampaignPayload {
  name?: string;
  objective?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  currency?: string;
  status?: CampaignStatus;
  targetingJson?: any;
}

export interface CreateFlightPayload {
  name: string;
  startDatetime: string;
  endDatetime: string;
  targetType: "screen" | "screen_group";
  targetId: string;
  status?: FlightStatus;
}

export interface UpdateFlightPayload {
  name?: string;
  startDatetime?: string;
  endDatetime?: string;
  targetType?: "screen" | "screen_group";
  targetId?: string;
  status?: FlightStatus;
}

export interface CreateBookingPayload {
  advertiserOrgId?: string;
  campaignId: string;
  currency: string;
  billingModel: "cpm" | "flat_fee" | "revenue_share";
  rate: number;
  agreedImpressions?: number;
  agreedAmountMinor?: number;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
}

export interface UpdateBookingPayload {
  campaignId?: string;
  currency?: string;
  billingModel?: "cpm" | "flat_fee" | "revenue_share";
  rate?: number;
  agreedImpressions?: number;
  agreedAmountMinor?: number;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export interface CampaignFilters {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
  org_id?: string;
}

export interface BookingFilters {
  campaignId?: string;
  advertiser_org_id?: string;
}

export async function fetchCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.from) params.append("from", filters.from);
  if (filters?.to) params.append("to", filters.to);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.org_id) params.append("org_id", filters.org_id);

  const response = await apiClient.get(`/campaigns?${params.toString()}`);
  return response.data.data;
}

export async function fetchCampaignDetail(id: string): Promise<CampaignWithStats> {
  const response = await apiClient.get(`/campaigns/${id}`);
  return response.data.data;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
  const response = await apiClient.post("/campaigns", payload);
  return response.data.data;
}

export async function updateCampaign(id: string, payload: UpdateCampaignPayload): Promise<Campaign> {
  const response = await apiClient.put(`/campaigns/${id}`, payload);
  return response.data.data;
}

export async function updateCampaignStatus(id: string, status: CampaignStatus): Promise<Campaign> {
  const response = await apiClient.patch(`/campaigns/${id}/status`, { status });
  return response.data.data;
}

export async function fetchFlights(campaignId: string): Promise<Flight[]> {
  const response = await apiClient.get(`/campaigns/${campaignId}/flights`);
  return response.data.data;
}

export async function fetchFlightById(flightId: string): Promise<Flight> {
  const response = await apiClient.get(`/flights/${flightId}`);
  return response.data.data;
}

export async function createFlight(campaignId: string, payload: CreateFlightPayload): Promise<Flight> {
  const response = await apiClient.post(`/campaigns/${campaignId}/flights`, payload);
  return response.data.data;
}

export async function updateFlight(id: string, payload: UpdateFlightPayload): Promise<Flight> {
  const response = await apiClient.put(`/flights/${id}`, payload);
  return response.data.data;
}

export async function updateFlightStatus(id: string, status: FlightStatus): Promise<Flight> {
  const response = await apiClient.patch(`/flights/${id}/status`, { status });
  return response.data.data;
}

export async function fetchBookings(filters?: BookingFilters): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filters?.campaignId) params.append("campaignId", filters.campaignId);
  if (filters?.advertiser_org_id) params.append("advertiser_org_id", filters.advertiser_org_id);

  const response = await apiClient.get(`/bookings?${params.toString()}`);
  return response.data.data;
}

export async function fetchBookingDetail(id: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${id}`);
  return response.data.data;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const response = await apiClient.post("/bookings", payload);
  return response.data.data;
}

export async function updateBooking(id: string, payload: UpdateBookingPayload): Promise<Booking> {
  const response = await apiClient.put(`/bookings/${id}`, payload);
  return response.data.data;
}
