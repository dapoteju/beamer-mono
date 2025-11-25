import apiClient from "./client";

export type CreativeStatus = "pending_review" | "approved" | "rejected";
export type CreativeApprovalStatus = "pending" | "approved" | "rejected";

export interface Creative {
  id: string;
  campaign_id: string;
  name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number;
  width: number;
  height: number;
  status: CreativeStatus;
  regions_required?: string[];
  created_at: string;
}

export interface CreativeApproval {
  id: string;
  creative_id: string;
  region_code: string;
  region_name: string;
  status: CreativeApprovalStatus;
  approval_code: string | null;
  documents: string[];
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
}

export interface PendingApproval {
  id: string;
  region_code: string;
  region_name: string;
  creative_id: string;
  creative_name: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_org_name: string;
  status: CreativeApprovalStatus;
  created_at: string;
}

export interface UpdateApprovalPayload {
  region: string;
  status: CreativeApprovalStatus;
  approval_code?: string;
  documents?: string[];
  rejected_reason?: string;
}

export interface CreateCreativePayload {
  name: string;
  file_url: string;
  mime_type: string;
  duration_seconds: number;
  width?: number;
  height?: number;
  regions_required?: string[];
}

export interface UpdateCreativePayload {
  name?: string;
  status?: CreativeStatus;
  regions_required?: string[];
}

export interface UploadResponse {
  file_url: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
}

export async function fetchCreatives(campaignId: string): Promise<Creative[]> {
  const response = await apiClient.get(`/campaigns/${campaignId}/creatives`);
  return response.data.data;
}

export async function fetchCreative(creativeId: string): Promise<Creative> {
  const response = await apiClient.get(`/creatives/${creativeId}`);
  return response.data.data;
}

export async function createCreative(
  campaignId: string,
  payload: CreateCreativePayload
): Promise<Creative> {
  const response = await apiClient.post(`/campaigns/${campaignId}/creatives`, payload);
  return response.data.data;
}

export async function updateCreative(
  creativeId: string,
  payload: UpdateCreativePayload
): Promise<Creative> {
  const response = await apiClient.patch(`/creatives/${creativeId}`, payload);
  return response.data.data;
}

export async function deleteCreative(creativeId: string): Promise<void> {
  await apiClient.delete(`/creatives/${creativeId}`);
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data.data;
}

export async function fetchCreativeApprovals(creativeId: string): Promise<CreativeApproval[]> {
  const response = await apiClient.get(`/creatives/${creativeId}/approvals`);
  return response.data.data;
}

export async function updateCreativeApproval(
  creativeId: string,
  payload: UpdateApprovalPayload
): Promise<void> {
  await apiClient.post(`/creatives/${creativeId}/approval`, payload);
}

export async function fetchPendingApprovals(status?: string): Promise<PendingApproval[]> {
  const params = status ? `?status=${status}` : "";
  const response = await apiClient.get(`/creative-approvals${params}`);
  return response.data.data;
}
