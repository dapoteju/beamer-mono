import apiClient from "./client";

export interface PublisherProfile {
  id: string;
  publisherType: "organisational" | "individual";
  organisationId: string | null;
  organisationName: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublisherProfileDetail extends PublisherProfile {
  screenCount: number;
  vehicleCount: number;
}

export interface CreatePublisherPayload {
  publisherType: "organisational" | "individual";
  organisationId?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdatePublisherPayload {
  publisherType?: "organisational" | "individual";
  organisationId?: string;
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function fetchPublishers(): Promise<PublisherProfile[]> {
  const response = await apiClient.get<PublisherProfile[]>("/publishers");
  return response.data;
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
  const response = await apiClient.get<{id: string; name: string}[]>("/publishers/organisations/list");
  return response.data;
}
