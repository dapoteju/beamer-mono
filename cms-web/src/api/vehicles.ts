import apiClient from "./client";

export interface Vehicle {
  id: string;
  name: string;
  publisherOrgId: string;
  publisherOrgName: string | null;
  externalId: string | null;
  licensePlate: string | null;
  makeModel: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;
  screensCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleScreen {
  id: string;
  code: string;
  name: string | null;
  widthPx: number;
  heightPx: number;
  orientation: string;
  screenType: string;
  city: string;
  region: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string | null;
}

export interface ListVehiclesParams {
  publisher_org_id?: string;
  q?: string;
  city?: string;
  region?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface ListVehiclesResponse {
  items: Vehicle[];
  count: number;
}

export interface CreateVehiclePayload {
  publisher_org_id?: string;
  name: string;
  external_id?: string;
  license_plate?: string;
  make_model?: string;
  city?: string;
  region?: string;
}

export interface UpdateVehiclePayload {
  name?: string;
  external_id?: string | null;
  license_plate?: string | null;
  make_model?: string | null;
  city?: string | null;
  region?: string | null;
  is_active?: boolean;
}

export async function fetchVehicles(params?: ListVehiclesParams): Promise<ListVehiclesResponse> {
  const response = await apiClient.get<ListVehiclesResponse>("/vehicles", { params });
  return response.data;
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const response = await apiClient.get<Vehicle>(`/vehicles/${id}`);
  return response.data;
}

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  const response = await apiClient.post<Vehicle>("/vehicles", payload);
  return response.data;
}

export async function updateVehicle(id: string, payload: UpdateVehiclePayload): Promise<Vehicle> {
  const response = await apiClient.patch<Vehicle>(`/vehicles/${id}`, payload);
  return response.data;
}

export async function deleteVehicle(id: string, force?: boolean): Promise<{ status: string; message: string }> {
  const params = force ? { force: "true" } : undefined;
  const response = await apiClient.delete<{ status: string; message: string }>(`/vehicles/${id}`, { params });
  return response.data;
}

export async function fetchVehicleScreens(vehicleId: string): Promise<VehicleScreen[]> {
  const response = await apiClient.get<VehicleScreen[]>(`/vehicles/${vehicleId}/screens`);
  return response.data;
}
