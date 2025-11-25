import { Location } from "./types";

let lastLocation: Location | null = null;

async function mockGpsProvider(): Promise<Location> {
  const baseLat = 6.4410;
  const baseLng = 3.4780;

  const jitterLat = (Math.random() - 0.5) * 0.001;
  const jitterLng = (Math.random() - 0.5) * 0.001;

  return {
    lat: baseLat + jitterLat,
    lng: baseLng + jitterLng,
    accuracy_m: 30,
    timestamp: new Date().toISOString(),
  };
}

export function getLastLocation(): Location | null {
  return lastLocation;
}

export async function startGpsPolling(pollIntervalMs: number = 30_000) {
  const hasBrowserGeolocation =
    typeof window !== "undefined" && !!navigator.geolocation;

  const provider = hasBrowserGeolocation
    ? async (): Promise<Location> =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy_m: pos.coords.accuracy,
                timestamp: new Date().toISOString(),
              });
            },
            (err) => {
              console.warn("Geolocation error, falling back to mock:", err);
              mockGpsProvider().then(resolve).catch(reject);
            }
          );
        })
    : mockGpsProvider;

  try {
    lastLocation = await provider();
  } catch (err) {
    console.error("Initial GPS fetch failed:", err);
  }

  setInterval(async () => {
    try {
      lastLocation = await provider();
    } catch (err) {
      console.error("GPS polling error:", err);
    }
  }, pollIntervalMs);
}
