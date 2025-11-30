import apiClient from "./client";

export interface PublisherProfile {
  id: string;
  publicCode: string;
  publisherType: "organisation" | "individual";
  organisationId: string | null;
  organisationName: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  screenCount: number;
  vehicleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherProfileDetail extends PublisherProfile {
}

export interface CreatePublisherPayload {
  publisherType: "organisation" | "individual";
  organisationId?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdatePublisherPayload {
  publisherType?: "organisation" | "individual";
  organisationId?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function fetchPublishers(): Promise<PublisherProfile[]> {
  const response = await apiClient.get<PublisherProfile[]>("/publishers");
  return response.data || [];
}

export async function fetchPublisherById(id: string): Promise<PublisherProfileDetail> {
  const response = await apiClient.get<PublisherProfileDetail>(`/publishers/${id}`);
  return response.data;
}

export async function createPublisher(payload: CreatePublisherPayload): Promise<PublisherProfile> {
  const response = await apiClient.post<PublisherProfile>("/publishers", payload);
  return response.data;
}

export async function updatePublisher(
  id: string,
  payload: UpdatePublisherPayload
): Promise<PublisherProfile> {
  const response = await apiClient.patch<PublisherProfile>(`/publishers/${id}`, payload);
  return response.data;
}

export async function deletePublisher(id: string): Promise<void> {
  await apiClient.delete(`/publishers/${id}`);
}

export async function fetchPublisherOrganisations(): Promise<{id: string; name: string}[]> {
  const response = await apiClient.get<{id: string; name: string}[]>("/publishers/dropdown/organisations");
  return response.data;
}

export interface PublisherOption {
  id: string;
  label: string;
  publisherType: "organisation" | "individual";
  organisationId: string | null;
}

export async function getPublisherOptions(): Promise<PublisherOption[]> {
  const response = await apiClient.get<PublisherOption[]>("/publishers/dropdown");
  return response.data;
}
