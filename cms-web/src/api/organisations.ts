import apiClient from "./client";

export interface Organisation {
  id: string;
  name: string;
  type: "advertiser" | "publisher" | "beamer_internal";
  country: string;
  billing_email: string;
  created_at: string;
}

export interface Screen {
  id: string;
  name: string;
  screen_type: string;
  city: string;
  region_code: string;
  status: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface Booking {
  id: string;
  campaign_id: string;
  start_date: string;
  end_date: string;
  currency: string;
  status: string;
  created_at: string;
}

export interface OrganisationDetail extends Organisation {
  screens: Screen[];
  campaigns: Campaign[];
  bookings: Booking[];
}

export async function fetchOrganisations(): Promise<Organisation[]> {
  const response = await apiClient.get<Organisation[]>("/organisations");
  return response.data;
}

export async function fetchOrganisationById(id: string): Promise<OrganisationDetail> {
  const response = await apiClient.get<OrganisationDetail>(`/organisations/${id}`);
  return response.data;
}
