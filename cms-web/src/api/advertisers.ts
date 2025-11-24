import apiClient from "./client";

export interface Advertiser {
  id: string;
  name: string;
  country: string;
  billingEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertiserDetail extends Advertiser {
  campaignCount: number;
}

export interface CreateAdvertiserPayload {
  name: string;
  country: string;
  billingEmail: string;
}

export interface UpdateAdvertiserPayload {
  name?: string;
  country?: string;
  billingEmail?: string;
}

export async function fetchAdvertisers(): Promise<Advertiser[]> {
  const response = await apiClient.get<Advertiser[]>("/advertisers");
  return response.data;
}

export async function fetchAdvertiserById(id: string): Promise<AdvertiserDetail> {
  const response = await apiClient.get<AdvertiserDetail>(`/advertisers/${id}`);
  return response.data;
}

export async function createAdvertiser(payload: CreateAdvertiserPayload): Promise<Advertiser> {
  const response = await apiClient.post<Advertiser>("/advertisers", payload);
  return response.data;
}

export async function updateAdvertiser(
  id: string,
  payload: UpdateAdvertiserPayload
): Promise<Advertiser> {
  const response = await apiClient.patch<Advertiser>(`/advertisers/${id}`, payload);
  return response.data;
}

export async function deleteAdvertiser(id: string): Promise<void> {
  await apiClient.delete(`/advertisers/${id}`);
}
