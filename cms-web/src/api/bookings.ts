import apiClient from "./client";

export type BillingModel = "fixed" | "cpm" | "cpd" | "share_of_loop";
export type BookingStatus = "pending" | "active" | "completed" | "cancelled";

export interface Booking {
  id: string;
  advertiserOrgId: string;
  advertiserOrgName?: string | null;
  campaignId: string;
  campaignName?: string | null;
  currency: string;
  billingModel: BillingModel;
  rate: number;
  agreedImpressions?: number | null;
  agreedAmountMinor?: number | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  createdAt: string;
}

export interface CreateBookingPayload {
  advertiserOrgId: string;
  campaignId: string;
  billingModel: BillingModel;
  rate: number;
  currency: string;
  agreedImpressions?: number;
  agreedAmountMinor?: number;
  startDate: string;
  endDate: string;
  status?: BookingStatus;
}

export interface UpdateBookingPayload {
  billingModel?: BillingModel;
  rate?: number;
  currency?: string;
  agreedImpressions?: number;
  agreedAmountMinor?: number;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export async function fetchBookings(campaignId?: string): Promise<Booking[]> {
  const params = campaignId ? { campaignId } : {};
  const response = await apiClient.get<{ status: string; data: Booking[] }>("/bookings", {
    params,
  });
  return response.data.data;
}

export async function fetchBookingById(id: string): Promise<Booking> {
  const response = await apiClient.get<{ status: string; data: Booking }>(`/bookings/${id}`);
  return response.data.data;
}

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const response = await apiClient.post<{ status: string; data: Booking }>("/bookings", payload);
  return response.data.data;
}

export async function updateBooking(id: string, payload: UpdateBookingPayload): Promise<Booking> {
  const response = await apiClient.put<{ status: string; data: Booking }>(
    `/bookings/${id}`,
    payload
  );
  return response.data.data;
}

export async function deleteBooking(id: string): Promise<void> {
  await apiClient.delete(`/bookings/${id}`);
}
