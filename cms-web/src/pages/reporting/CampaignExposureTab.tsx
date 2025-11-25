import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { getCampaignExposureReport } from "../../api/reports";
import "leaflet/dist/leaflet.css";

interface CampaignExposureTabProps {
  campaignId: string;
  startDate: string;
  endDate: string;
  hasLoadedOnce: boolean;
}

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getMarkerRadius(impressions: number, maxImpressions: number): number {
  const minRadius = 6;
  const maxRadius = 30;
  const ratio = Math.sqrt(impressions / maxImpressions);
  return minRadius + ratio * (maxRadius - minRadius);
}

function getMarkerColor(impressions: number, maxImpressions: number): string {
  const ratio = impressions / maxImpressions;
  if (ratio >= 0.7) return "#ef4444";
  if (ratio >= 0.4) return "#f59e0b";
  if (ratio >= 0.2) return "#3b82f6";
  return "#10b981";
}

function getScreenTypeBadgeClass(screenType?: string | null): string {
  const type = screenType?.toLowerCase();
  if (type === "vehicle") return "bg-green-100 text-green-800";
  if (type === "billboard") return "bg-blue-100 text-blue-800";
  if (type === "indoor") return "bg-purple-100 text-purple-800";
  return "bg-zinc-100 text-zinc-800";
}

export default function CampaignExposureTab({
  campaignId,
  startDate,
  endDate,
  hasLoadedOnce,
}: CampaignExposureTabProps) {
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["campaignExposure", campaignId, startDate, endDate],
    queryFn: () =>
      getCampaignExposureReport({ campaignId, startDate, endDate }),
    enabled: hasLoadedOnce && !!campaignId && !!startDate && !!endDate,
  });

  useEffect(() => {
    if (hasLoadedOnce && campaignId && startDate && endDate) {
      refetch();
    }
  }, [hasLoadedOnce, campaignId, startDate, endDate, refetch]);

  const maxImpressions = useMemo(() => {
    if (!report || report.points.length === 0) return 1;
    return Math.max(...report.points.map(p => p.impressions));
  }, [report]);

  const bounds = useMemo(() => {
    if (!report || report.points.length === 0) return null;

    const lats = report.points.map(p => p.lat);
    const lngs = report.points.map(p => p.lng);

    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    );
  }, [report]);

  if (!hasLoadedOnce) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            Load a report first
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Select a campaign and date range, then click "Load Report" to see
            exposure data.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-zinc-600">Loading exposure data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">
            Error Loading Exposure Data
          </p>
          <p className="text-sm text-red-700 mt-1">
            {(error as Error)?.message || "Failed to load exposure data. Please try again."}
          </p>
          <p className="text-xs text-red-600 mt-2">
            If the problem persists, contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!report || report.totalExposureLocations === 0) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            No Exposure Locations
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            No exposure locations found for this campaign and date range.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            This usually means there were no impressions during this period.
          </p>
        </div>
      </div>
    );
  }

  const defaultCenter: [number, number] = [6.5244, 3.3792];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Exposure Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Total Impressions
            </p>
            <p className="text-2xl font-semibold text-zinc-900 mt-1">
              {formatNumber(report.totalImpressions)}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Exposure Locations
            </p>
            <p className="text-2xl font-semibold text-zinc-900 mt-1">
              {formatNumber(report.totalExposureLocations)}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Tracked Date Range
            </p>
            <p className="text-sm font-medium text-zinc-900 mt-1">
              {formatDate(report.startDate)}
            </p>
            <p className="text-sm text-zinc-600">
              to {formatDate(report.endDate)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Exposure Map
        </h2>
        <div className="h-[500px] rounded-lg overflow-hidden border border-zinc-200">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            bounds={bounds || undefined}
            boundsOptions={{ padding: [50, 50] }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {report.points.map((point, idx) => (
              <CircleMarker
                key={`${point.lat}-${point.lng}-${idx}`}
                center={[point.lat, point.lng]}
                radius={getMarkerRadius(point.impressions, maxImpressions)}
                fillColor={getMarkerColor(point.impressions, maxImpressions)}
                color="#ffffff"
                weight={2}
                fillOpacity={0.7}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-medium text-zinc-900">
                      {formatNumber(point.impressions)} Impressions
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Location: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="mt-4 flex items-center gap-6">
          <p className="text-sm font-medium text-zinc-700">Impression Density:</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
              <span className="text-xs text-zinc-600">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
              <span className="text-xs text-zinc-600">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
              <span className="text-xs text-zinc-600">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
              <span className="text-xs text-zinc-600">Very High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Screens
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Screen
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Publisher
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Exposure Locations
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {report.byScreen.map((screen) => (
                <tr key={screen.screenId} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-sm text-zinc-900">
                    {screen.screenName || screen.screenId}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScreenTypeBadgeClass(screen.screenType)}`}
                    >
                      {screen.screenType
                        ? screen.screenType.charAt(0).toUpperCase() + screen.screenType.slice(1)
                        : "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {screen.publisherName || "N/A"}
                    {screen.publisherType && (
                      <span className="ml-2 text-xs text-zinc-500">
                        ({screen.publisherType})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-900 text-right font-medium">
                    {formatNumber(screen.impressions)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 text-right">
                    {formatNumber(screen.exposureLocations)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
