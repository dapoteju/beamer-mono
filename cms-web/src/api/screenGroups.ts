import apiClient from "./client";

export interface ScreenGroup {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  screenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenGroupDetail extends ScreenGroup {
  onlineCount: number;
  offlineCount: number;
}

export interface GroupMember {
  screenId: string;
  screenCode: string;
  screenName: string | null;
  city: string;
  regionCode: string;
  status: string;
  resolutionWidth: number;
  resolutionHeight: number;
  isOnline: boolean;
  lastSeenAt: string | null;
  addedAt: string;
  addedByUserId: string | null;
  addedByUserName: string | null;
  groupCount: number;
}

export interface GroupFlight {
  flightId: string;
  flightName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  startDatetime: string;
  endDatetime: string;
}

export interface GroupHealth {
  totalScreens: number;
  onlineCount: number;
  offlineCount: number;
  regionBreakdown: Record<string, number>;
  resolutionBreakdown: Record<string, number>;
  lastSeenRange: { oldest: string | null; newest: string | null };
}

export interface ListGroupsParams {
  org_id?: string;
  q?: string;
  archived?: boolean;
}

export interface ListMembersParams {
  status?: string;
  city?: string;
  region?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchScreenGroups(
  params?: ListGroupsParams
): Promise<{ items: ScreenGroup[]; count: number }> {
  const queryParams = new URLSearchParams();
  if (params?.org_id) queryParams.append("org_id", params.org_id);
  if (params?.q) queryParams.append("q", params.q);
  if (params?.archived !== undefined)
    queryParams.append("archived", String(params.archived));

  const response = await apiClient.get(`/screen-groups?${queryParams.toString()}`);
  return response.data;
}

export async function fetchScreenGroup(id: string): Promise<ScreenGroupDetail> {
  const response = await apiClient.get(`/screen-groups/${id}`);
  return response.data.data;
}

export async function createScreenGroup(data: {
  org_id: string;
  name: string;
  description?: string;
}): Promise<{ id: string; name: string }> {
  const response = await apiClient.post("/screen-groups", data);
  return response.data.data;
}

export async function updateScreenGroup(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    is_archived?: boolean;
  }
): Promise<{ id: string; name: string }> {
  const response = await apiClient.patch(`/screen-groups/${id}`, data);
  return response.data.data;
}

export async function archiveScreenGroup(id: string): Promise<void> {
  await apiClient.delete(`/screen-groups/${id}`);
}

export async function deleteScreenGroup(
  id: string,
  force: boolean = false
): Promise<void> {
  await apiClient.delete(`/screen-groups/${id}?force=${force}`);
}

export async function fetchGroupMembers(
  groupId: string,
  params?: ListMembersParams
): Promise<PaginatedResponse<GroupMember>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.city) queryParams.append("city", params.city);
  if (params?.region) queryParams.append("region", params.region);
  if (params?.q) queryParams.append("q", params.q);
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.page_size) queryParams.append("page_size", String(params.page_size));

  const response = await apiClient.get(
    `/screen-groups/${groupId}/members?${queryParams.toString()}`
  );
  return response.data;
}

export async function addGroupMembers(
  groupId: string,
  screenIds: string[]
): Promise<{ added: number; skipped: number }> {
  const response = await apiClient.post(`/screen-groups/${groupId}/members`, {
    screen_ids: screenIds,
  });
  return response.data.data;
}

export async function removeGroupMembers(
  groupId: string,
  screenIds: string[]
): Promise<{ removed: number }> {
  const response = await apiClient.delete(`/screen-groups/${groupId}/members`, {
    data: { screen_ids: screenIds },
  });
  return response.data.data;
}

export async function uploadGroupMembersCsv(
  groupId: string,
  csvData: string
): Promise<{
  added: number;
  skipped: number;
  not_found: number;
  not_found_items: string[];
}> {
  const response = await apiClient.post(
    `/screen-groups/${groupId}/members/upload-csv`,
    { csv_data: csvData }
  );
  return response.data.data;
}

export async function fetchGroupFlights(groupId: string): Promise<GroupFlight[]> {
  const response = await apiClient.get(`/screen-groups/${groupId}/flights`);
  return response.data.data;
}

export async function fetchGroupHealth(groupId: string): Promise<GroupHealth> {
  const response = await apiClient.get(`/screen-groups/${groupId}/health`);
  return response.data.data;
}
