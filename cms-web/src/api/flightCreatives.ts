import apiClient from "./client";

export interface FlightCreative {
  id: string;
  flightId: string;
  creativeId: string;
  weight: number;
  creative?: {
    id: string;
    name: string;
    fileUrl: string;
    mimeType: string;
    durationSeconds: number;
    width: number;
    height: number;
    status: string;
  };
}

export interface FlightCreativeInput {
  creative_id: string;
  weight: number;
}

export async function fetchFlightCreatives(flightId: string): Promise<FlightCreative[]> {
  const response = await apiClient.get(`/flights/${flightId}/creatives`);
  return response.data.data;
}

export async function setFlightCreatives(
  flightId: string,
  items: FlightCreativeInput[]
): Promise<FlightCreative[]> {
  const response = await apiClient.post(`/flights/${flightId}/creatives`, { items });
  return response.data.data;
}

export async function updateFlightCreativeWeight(
  flightId: string,
  flightCreativeId: string,
  weight: number
): Promise<FlightCreative> {
  const response = await apiClient.patch(`/flights/${flightId}/creatives/${flightCreativeId}`, {
    weight,
  });
  return response.data.data;
}

export async function deleteFlightCreative(
  flightId: string,
  flightCreativeId: string
): Promise<void> {
  await apiClient.delete(`/flights/${flightId}/creatives/${flightCreativeId}`);
}

export async function addCreativeToFlight(
  flightId: string,
  creativeId: string,
  weight: number = 1
): Promise<FlightCreative> {
  const response = await apiClient.post(`/flights/${flightId}/creatives`, {
    items: [{ creative_id: creativeId, weight }]
  });
  return response.data.data[0];
}
