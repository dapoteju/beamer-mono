import { useQuery } from "@tanstack/react-query";
import {
  getCampaignComplianceReport,
  type ComplianceScreenStatus,
} from "../../api/reports";
import { downloadCsv } from "../../utils/csv";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from "recharts";

interface CampaignComplianceTabProps {
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

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getStatusBadgeClass(status: ComplianceScreenStatus): string {
  switch (status) {
    case "OK":
      return "bg-green-100 text-green-800";
    case "NO_DELIVERY":
      return "bg-amber-100 text-amber-800";
    case "OFFLINE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

function getStatusLabel(status: ComplianceScreenStatus): string {
  switch (status) {
    case "OK":
      return "OK";
    case "NO_DELIVERY":
      return "No Delivery";
    case "OFFLINE":
      return "Offline";
    default:
      return status;
  }
}

function getScreenTypeBadgeClass(screenType?: string | null): string {
  const type = screenType?.toLowerCase();
  if (type === "vehicle") return "bg-green-100 text-green-800";
  if (type === "billboard") return "bg-blue-100 text-blue-800";
  if (type === "indoor") return "bg-purple-100 text-purple-800";
  return "bg-zinc-100 text-zinc-800";
}

export default function CampaignComplianceTab({
  campaignId,
  startDate,
  endDate,
  hasLoadedOnce,
}: CampaignComplianceTabProps) {
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["campaignCompliance", campaignId, startDate, endDate],
    queryFn: () =>
      getCampaignComplianceReport({ campaignId, startDate, endDate }),
    enabled: hasLoadedOnce && !!campaignId && !!startDate && !!endDate,
  });

  function handleExportCompliance() {
    if (!report || report.byScreen.length === 0) return;

    const rows: (string | number | null | undefined)[][] = [
      [
        "Screen Name",
        "Screen ID",
        "Screen Type",
        "Publisher",
        "Publisher Type",
        "Impressions",
        "Has Heartbeats",
        "Status",
        "First Impression At",
        "Last Impression At",
      ],
      ...report.byScreen.map((screen) => [
        screen.screenName || screen.screenId,
        screen.screenId,
        screen.screenType || "N/A",
        screen.publisherName || "N/A",
        screen.publisherType || "N/A",
        screen.impressions,
        screen.hasHeartbeats ? "Yes" : "No",
        screen.status,
        screen.firstImpressionAt || "N/A",
        screen.lastImpressionAt || "N/A",
      ]),
    ];

    const filename = `campaign-${report.campaignId}-compliance-${report.startDate}-${report.endDate}.csv`;
    downloadCsv(filename, rows);
  }

  if (!hasLoadedOnce || !campaignId || !startDate || !endDate) {
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            Compliance Report
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Select a campaign and date range, then click "Load Report" to view
            compliance data.
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
          <p className="text-sm text-zinc-600">Loading compliance report...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">
            Error Loading Compliance Report
          </p>
          <p className="text-sm text-red-700 mt-1">
            We couldn't load the compliance report. Please try again. If the
            problem persists, contact support.
          </p>
          <p className="text-xs text-red-600 mt-2">
            {(error as Error)?.message || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  if (report.summary.totalScreensScheduled === 0) {
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-zinc-900">
            No Screens Scheduled
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            No screens were scheduled for this campaign during the selected date
            range.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {formatDate(report.startDate)} to {formatDate(report.endDate)}
          </p>
        </div>
      </div>
    );
  }

  const chartData = report.byDay.map((day) => ({
    date: formatDate(day.date),
    impressions: day.impressions,
    hasActiveFlight: day.hasActiveFlight,
    isZeroDeliveryDay: day.hasActiveFlight && day.impressions === 0,
    scheduledScreens: day.scheduledScreens,
    activeScreens: day.activeScreens,
    offlineScreens: day.offlineScreens,
    complianceRate: day.scheduledScreens > 0 
      ? Math.round((day.activeScreens / day.scheduledScreens) * 100) 
      : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Compliance Summary
          </h2>
          <button
            onClick={handleExportCompliance}
            disabled={report.byScreen.length === 0}
            className="px-3 py-1.5 text-sm bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Compliance (CSV)
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Screens Scheduled
            </p>
            <p className="text-2xl font-semibold text-zinc-900 mt-1">
              {formatNumber(report.summary.totalScreensScheduled)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs font-medium text-green-700 uppercase">
              With Delivery
            </p>
            <p className="text-2xl font-semibold text-green-900 mt-1">
              {formatNumber(report.summary.screensWithImpressions)}
            </p>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <p className="text-xs font-medium text-amber-700 uppercase">
              Zero Delivery
            </p>
            <p className="text-2xl font-semibold text-amber-900 mt-1">
              {formatNumber(report.summary.screensWithZeroImpressions)}
            </p>
          </div>

          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-xs font-medium text-red-700 uppercase">
              No Heartbeats
            </p>
            <p className="text-2xl font-semibold text-red-900 mt-1">
              {formatNumber(report.summary.screensWithoutHeartbeats)}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-700 uppercase">
              Total Impressions
            </p>
            <p className="text-2xl font-semibold text-blue-900 mt-1">
              {formatNumber(report.summary.totalImpressions)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Active Days
            </p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {report.summary.activeDays}{" "}
              <span className="text-sm font-normal text-zinc-500">
                (days with scheduled flights)
              </span>
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Days With Impressions
            </p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {report.summary.daysWithImpressions}{" "}
              <span className="text-sm font-normal text-zinc-500">
                of {report.summary.activeDays} active days
              </span>
            </p>
          </div>
          <div className="bg-zinc-50 rounded-lg p-4">
            <p className="text-xs font-medium text-zinc-500 uppercase">
              Days With Active Screens
            </p>
            <p className="text-lg font-semibold text-zinc-900 mt-1">
              {report.summary.daysWithHeartbeats}{" "}
              <span className="text-sm font-normal text-zinc-500">
                (screens reporting heartbeats)
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Daily Screen Activity Chart
        </h2>
        <p className="text-sm text-zinc-600 mb-4">
          Stacked bars show scheduled screens vs screens with heartbeats each day.
          Green = active (heartbeats received), Red = offline (no heartbeats).
        </p>

        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-500">No daily data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#71717a"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                stroke="#71717a"
                label={{ value: 'Screens', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                stroke="#71717a"
                tickFormatter={(value: number) => `${value}%`}
                domain={[0, 100]}
                label={{ value: 'Compliance %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e4e4e7",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-md shadow border border-zinc-200">
                        <p className="font-medium text-zinc-900">{label}</p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="text-zinc-600">
                            Scheduled: {item.scheduledScreens} screens
                          </p>
                          <p className="text-green-600">
                            Active (heartbeats): {item.activeScreens} screens
                          </p>
                          <p className="text-red-600">
                            Offline (no heartbeats): {item.offlineScreens} screens
                          </p>
                          <p className="text-blue-600">
                            Compliance: {item.complianceRate}%
                          </p>
                          <p className="text-zinc-500 mt-1">
                            Impressions: {item.impressions.toLocaleString()}
                          </p>
                          {!item.hasActiveFlight && (
                            <p className="text-zinc-400 italic">
                              No flight scheduled
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="activeScreens" 
                stackId="a" 
                fill="#22c55e" 
                name="Active Screens"
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                yAxisId="left" 
                dataKey="offlineScreens" 
                stackId="a" 
                fill="#ef4444" 
                name="Offline Screens"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="complianceRate" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                name="Compliance Rate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Screen Compliance Details
        </h2>

        {report.byScreen.length === 0 ? (
          <p className="text-sm text-zinc-500">No screen data available.</p>
        ) : (
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
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Heartbeats
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                    Status
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
                {report.byScreen.map((screen) => (
                  <tr key={screen.screenId} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {screen.screenName || screen.screenId}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScreenTypeBadgeClass(
                          screen.screenType
                        )}`}
                      >
                        {screen.screenType
                          ? screen.screenType.charAt(0).toUpperCase() +
                            screen.screenType.slice(1)
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
                    <td className="px-4 py-3 text-sm text-center">
                      {screen.hasHeartbeats ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          screen.status
                        )}`}
                      >
                        {getStatusLabel(screen.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.firstImpressionAt
                        ? formatDateTime(screen.firstImpressionAt)
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.lastImpressionAt
                        ? formatDateTime(screen.lastImpressionAt)
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
