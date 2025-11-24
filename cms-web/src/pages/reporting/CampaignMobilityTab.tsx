import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import { getCampaignMobilityReport } from "../../api/reports";
import "leaflet/dist/leaflet.css";

interface CampaignMobilityTabProps {
  campaignId: string;
  startDate: string;
  endDate: string;
  hasLoadedOnce: boolean;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

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

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignMobilityTab({
  campaignId,
  startDate,
  endDate,
  hasLoadedOnce,
}: CampaignMobilityTabProps) {
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["campaignMobility", campaignId, startDate, endDate],
    queryFn: () =>
      getCampaignMobilityReport({ campaignId, startDate, endDate }),
    enabled: hasLoadedOnce && !!campaignId && !!startDate && !!endDate,
  });

  useEffect(() => {
    if (hasLoadedOnce && campaignId && startDate && endDate) {
      refetch();
    }
  }, [hasLoadedOnce, campaignId, startDate, endDate, refetch]);

  const totalPoints = useMemo(() => {
    if (!report) return 0;
    return report.screens.reduce((sum, s) => sum + s.points.length, 0);
  }, [report]);

  const bounds = useMemo(() => {
    if (!report || report.screens.length === 0) return null;
    
    const allPoints = report.screens.flatMap(s => s.points);
    if (allPoints.length === 0) return null;

    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            Load a report first
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Select a campaign and date range, then click "Load Report" to see
            mobility data.
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
          <p className="text-sm text-zinc-600">Loading mobility data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">
            Error Loading Mobility Data
          </p>
          <p className="text-sm text-red-700 mt-1">
            {(error as Error)?.message || "Failed to load mobility data. Please try again."}
          </p>
          <p className="text-xs text-red-600 mt-2">
            If the problem persists, contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!report || report.screens.length === 0) {
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            No Mobile Movement Data
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            No GPS tracking data found for this campaign in the selected date range.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            This usually means the campaign has no mobile screens or no GPS data was recorded during this period.
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
          Mobility Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Mobile Screens Tracked
            </p>
            <p className="text-2xl font-semibold text-zinc-900 mt-1">
              {report.screens.length}
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Total GPS Points
            </p>
            <p className="text-2xl font-semibold text-zinc-900 mt-1">
              {totalPoints.toLocaleString()}
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
          Movement Map
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

            {report.screens.map((screen, screenIndex) => {
              const color = COLORS[screenIndex % COLORS.length];
              const positions = screen.points.map(p => [p.lat, p.lng] as [number, number]);
              
              if (positions.length === 0) return null;

              return (
                <div key={screen.screenId}>
                  <Polyline
                    positions={positions}
                    color={color}
                    weight={3}
                    opacity={0.7}
                  />
                  
                  <CircleMarker
                    center={positions[0]}
                    radius={8}
                    fillColor={color}
                    color="#ffffff"
                    weight={2}
                    fillOpacity={1}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-medium">{screen.screenName || screen.screenId}</p>
                        <p className="text-zinc-500">Start Point</p>
                        <p className="text-xs text-zinc-400 mt-1">
                          {formatDateTime(screen.points[0].recordedAt)}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>

                  {positions.length > 1 && (
                    <CircleMarker
                      center={positions[positions.length - 1]}
                      radius={6}
                      fillColor={color}
                      color="#ffffff"
                      weight={2}
                      fillOpacity={0.7}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-medium">{screen.screenName || screen.screenId}</p>
                          <p className="text-zinc-500">End Point</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {formatDateTime(screen.points[screen.points.length - 1].recordedAt)}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )}
                </div>
              );
            })}
          </MapContainer>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-3">
          {report.screens.map((screen, idx) => (
            <div key={screen.screenId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              ></div>
              <span className="text-sm text-zinc-700">
                {screen.screenName || screen.screenId}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Mobile Screens
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
                  GPS Points
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  First Seen
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {report.screens.map((screen, idx) => {
                const firstSeen = screen.points.length > 0
                  ? screen.points[0].recordedAt
                  : null;
                const lastSeen = screen.points.length > 0
                  ? screen.points[screen.points.length - 1].recordedAt
                  : null;

                return (
                  <tr key={screen.screenId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        ></div>
                        <span className="text-zinc-900">
                          {screen.screenName || screen.screenId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (screen.screenClassification || screen.screenType) === "vehicle"
                            ? "bg-green-100 text-green-800"
                            : (screen.screenClassification || screen.screenType) === "billboard"
                            ? "bg-blue-100 text-blue-800"
                            : (screen.screenClassification || screen.screenType) === "indoor"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        {(screen.screenClassification || screen.screenType)
                          ? (screen.screenClassification || screen.screenType)!.charAt(0).toUpperCase() +
                            (screen.screenClassification || screen.screenType)!.slice(1)
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
                      {screen.points.length.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {firstSeen ? formatDateTime(firstSeen) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      {lastSeen ? formatDateTime(lastSeen) : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
