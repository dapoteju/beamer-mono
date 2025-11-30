import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCampaignReport } from "../../api/reports";
import { downloadCsv } from "../../utils/csv";
import CampaignExposureTab from "../reporting/CampaignExposureTab";
import CampaignComplianceTab from "../reporting/CampaignComplianceTab";
import CampaignDiagnosticsTab from "../reporting/CampaignDiagnosticsTab";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ReportTab = "delivery" | "exposure" | "compliance" | "diagnostics";

interface CampaignReportingTabProps {
  campaignId: string;
}

export default function CampaignReportingTab({ campaignId }: CampaignReportingTabProps) {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ReportTab>("delivery");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    setStartDate(last7Days.toISOString().split("T")[0]);
    setEndDate(new Date().toISOString().split("T")[0]);
  }, []);

  const {
    data: reportData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["campaignReport", campaignId, startDate, endDate],
    queryFn: () => getCampaignReport({ campaignId, startDate, endDate }),
    enabled: !!campaignId && !!startDate && !!endDate,
  });

  useEffect(() => {
    if (reportData) {
      setHasLoadedOnce(true);
    }
  }, [reportData]);

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

  function handleExportByDay() {
    if (!reportData || reportData.byDay.length === 0) return;

    const rows: (string | number)[][] = [
      ["Date", "Impressions"],
      ...reportData.byDay.map((day) => [day.date, day.impressions]),
    ];

    const filename = `campaign-${reportData.campaignId}-by-day-${reportData.startDate}-${reportData.endDate}.csv`;
    downloadCsv(filename, rows);
  }

  function handleExportByScreen() {
    if (!reportData || reportData.byScreen.length === 0) return;

    const rows: (string | number)[][] = [
      ["Screen Name or ID", "Screen ID", "Screen Type", "Impressions"],
      ...reportData.byScreen
        .sort((a, b) => b.impressions - a.impressions)
        .map((screen) => [
          screen.screenName || screen.screenId,
          screen.screenId,
          screen.screenClassification || screen.screenType || "N/A",
          screen.impressions,
        ]),
    ];

    const filename = `campaign-${reportData.campaignId}-by-screen-${reportData.startDate}-${reportData.endDate}.csv`;
    downloadCsv(filename, rows);
  }

  function getScreenTypeDistribution() {
    if (!reportData || reportData.byScreen.length === 0) return [];

    const distribution = new Map<string, number>();
    
    reportData.byScreen.forEach((screen) => {
      const type = screen.screenClassification || screen.screenType || "Unknown";
      const formattedType = type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      distribution.set(formattedType, (distribution.get(formattedType) || 0) + screen.impressions);
    });

    return Array.from(distribution.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-zinc-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || !startDate || !endDate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : "Load Report"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              {(error as any)?.response?.data?.message || "Failed to load report"}
            </p>
          </div>
        )}
      </div>

      <div className="border-b border-zinc-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("delivery")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              activeTab === "delivery"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            Delivery Report
          </button>
          <button
            onClick={() => setActiveTab("exposure")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              activeTab === "exposure"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            Exposure
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              activeTab === "compliance"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            Compliance
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              activeTab === "diagnostics"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
            }`}
          >
            Diagnostics
          </button>
        </nav>
      </div>

      {activeTab === "exposure" ? (
        <CampaignExposureTab
          campaignId={campaignId}
          startDate={startDate}
          endDate={endDate}
          hasLoadedOnce={hasLoadedOnce}
        />
      ) : activeTab === "compliance" ? (
        <CampaignComplianceTab
          campaignId={campaignId}
          startDate={startDate}
          endDate={endDate}
          hasLoadedOnce={hasLoadedOnce}
        />
      ) : activeTab === "diagnostics" ? (
        <CampaignDiagnosticsTab campaignId={campaignId} />
      ) : (
        <>
          {isLoading && !reportData && (
            <div className="bg-white rounded-lg border border-zinc-200 p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-zinc-600">Loading report...</p>
              </div>
            </div>
          )}

          {!isLoading && !reportData && (
            <div className="bg-white rounded-lg border border-zinc-200 p-12 text-center">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-4 text-sm font-medium text-zinc-900">No Report Data</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Select a date range and click "Load Report" to view campaign performance.
              </p>
            </div>
          )}

          {reportData && !isLoading && (
            <>
              {reportData.totalImpressions === 0 ? (
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <h3 className="mt-4 text-sm font-medium text-zinc-900">No Impressions</h3>
                    <p className="mt-2 text-sm text-zinc-500">
                      No impressions recorded for this campaign during the selected date range.
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {formatDate(reportData.startDate)} to {formatDate(reportData.endDate)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-zinc-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-zinc-900">Summary</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportByDay}
                          disabled={reportData.byDay.length === 0}
                          className="px-3 py-1.5 text-sm bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Export By Day
                        </button>
                        <button
                          onClick={handleExportByScreen}
                          disabled={reportData.byScreen.length === 0}
                          className="px-3 py-1.5 text-sm bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Export By Screen
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase">
                          Total Impressions
                        </p>
                        <p className="text-2xl font-semibold text-zinc-900 mt-1">
                          {reportData.totalImpressions.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase">
                          Date Range
                        </p>
                        <p className="text-sm font-medium text-zinc-900 mt-1">
                          {formatDate(reportData.startDate)}
                        </p>
                        <p className="text-sm text-zinc-600">to {formatDate(reportData.endDate)}</p>
                      </div>
                      <div className="bg-zinc-50 rounded-lg p-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase">
                          Active Screens
                        </p>
                        <p className="text-2xl font-semibold text-zinc-900 mt-1">
                          {reportData.byScreen.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-zinc-200 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                      Impressions by Day
                    </h2>
                    {reportData.byDay.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No daily impression data available.
                      </p>
                    ) : (
                      <div className="mb-6">
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={reportData.byDay.map((day) => ({
                              date: formatDate(day.date),
                              impressions: day.impressions,
                            }))}
                            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 12 }}
                              stroke="#71717a"
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              stroke="#71717a"
                              tickFormatter={(value: number) => value.toLocaleString()}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e4e4e7",
                                borderRadius: "0.375rem",
                                fontSize: "0.875rem",
                              }}
                              formatter={(value: number) => [
                                value.toLocaleString(),
                                "Impressions",
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="impressions"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ fill: "#3b82f6", r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg border border-zinc-200 p-6">
                    <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                      Impressions by Screen
                    </h2>
                    {reportData.byScreen.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No screen impression data available.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-700 mb-3">
                            Top 10 Screens
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={reportData.byScreen
                                .sort((a, b) => b.impressions - a.impressions)
                                .slice(0, 10)
                                .map((screen) => ({
                                  name: screen.screenName || screen.screenId,
                                  impressions: screen.impressions,
                                }))}
                              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 10 }}
                                stroke="#71717a"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                stroke="#71717a"
                                tickFormatter={(value: number) => value.toLocaleString()}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e4e4e7",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.875rem",
                                }}
                                formatter={(value: number) => [
                                  value.toLocaleString(),
                                  "Impressions",
                                ]}
                              />
                              <Bar dataKey="impressions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-700 mb-3">
                            By Screen Type
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={getScreenTypeDistribution()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({name, percent}) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {getScreenTypeDistribution().map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e4e4e7",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.875rem",
                                }}
                                formatter={(value: number) => [
                                  value.toLocaleString(),
                                  "Impressions",
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
