import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "../api/campaigns";
import { getCampaignReport, type CampaignReport } from "../api/reports";
import { useAuthStore } from "../store/authStore";
import { downloadCsv } from "../utils/csv";

export default function CampaignReporting() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    searchParams.get("campaignId") || ""
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reportData, setReportData] = useState<CampaignReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["campaigns", "all"],
    queryFn: () => fetchCampaigns({ status: "active" }),
  });

  useEffect(() => {
    const campaignIdFromUrl = searchParams.get("campaignId");
    if (campaignIdFromUrl && campaigns.length > 0) {
      const campaign = campaigns.find((c) => c.id === campaignIdFromUrl);
      if (campaign) {
        setSelectedCampaignId(campaignIdFromUrl);
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        setStartDate(last7Days.toISOString().split("T")[0]);
        setEndDate(new Date().toISOString().split("T")[0]);
      }
    }
  }, [searchParams, campaigns]);

  async function handleLoadReport() {
    if (!selectedCampaignId) {
      setReportError("Please select a campaign");
      return;
    }

    if (!startDate || !endDate) {
      setReportError("Please select both start and end dates");
      return;
    }

    try {
      setIsLoadingReport(true);
      setReportError(null);
      const data = await getCampaignReport({
        campaignId: selectedCampaignId,
        startDate,
        endDate,
      });
      setReportData(data);
    } catch (err: any) {
      console.error("Failed to load report:", err);
      setReportError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load report. Please try again."
      );
      setReportData(null);
    } finally {
      setIsLoadingReport(false);
    }
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
      ["Screen Name or ID", "Screen ID", "Impressions"],
      ...reportData.byScreen
        .sort((a, b) => b.impressions - a.impressions)
        .map((screen) => [
          screen.screenName || screen.screenId,
          screen.screenId,
          screen.impressions,
        ]),
    ];

    const filename = `campaign-${reportData.campaignId}-by-screen-${reportData.startDate}-${reportData.endDate}.csv`;
    downloadCsv(filename, rows);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Campaign Reporting
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          View proof-of-play data and impressions for campaigns
        </p>
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Campaign
            </label>
            {isLoadingCampaigns ? (
              <div className="text-sm text-zinc-500">Loading campaigns...</div>
            ) : (
              <select
                value={selectedCampaignId}
                onChange={(e) => {
                  setSelectedCampaignId(e.target.value);
                  setSearchParams(
                    e.target.value ? { campaignId: e.target.value } : {}
                  );
                  setReportData(null);
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                    {user?.orgType === "beamer_internal" &&
                      campaign.advertiserOrgName &&
                      ` (${campaign.advertiserOrgName})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setReportData(null);
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setReportData(null);
              }}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleLoadReport}
            disabled={isLoadingReport || !selectedCampaignId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            {isLoadingReport ? "Loading..." : "Load Report"}
          </button>
        </div>

        {reportError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800">Error Loading Report</p>
            <p className="text-sm text-red-700 mt-1">
              {reportError}
            </p>
            <p className="text-xs text-red-600 mt-2">
              If the problem persists, contact support.
            </p>
          </div>
        )}
      </div>

      {isLoadingReport && !reportData && (
        <div className="bg-white rounded-lg border border-zinc-200 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-zinc-600">Loading report...</p>
          </div>
        </div>
      )}

      {reportData && !isLoadingReport && (
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
                      Export By Day (CSV)
                    </button>
                    <button
                      onClick={handleExportByScreen}
                      disabled={reportData.byScreen.length === 0}
                      className="px-3 py-1.5 text-sm bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export By Screen (CSV)
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
                      Number of Active Screens
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                            Impressions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {reportData.byDay.map((day) => (
                          <tr key={day.date} className="hover:bg-zinc-50">
                            <td className="px-4 py-3 text-sm text-zinc-900">
                              {formatDate(day.date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-900 text-right font-medium">
                              {day.impressions.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                            Screen Name
                          </th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                            Impressions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {reportData.byScreen
                          .sort((a, b) => b.impressions - a.impressions)
                          .map((screen) => (
                            <tr key={screen.screenId} className="hover:bg-zinc-50">
                              <td className="px-4 py-3 text-sm text-zinc-900">
                                {screen.screenName || screen.screenId}
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-900 text-right font-medium">
                                {screen.impressions.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
