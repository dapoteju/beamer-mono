import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchCampaigns } from "../api/campaigns";
import { getCampaignReport, type CampaignReport } from "../api/reports";
import { useAuthStore } from "../store/authStore";

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
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {reportError}
          </div>
        )}
      </div>

      {reportData && (
        <>
          {reportData.totalImpressions === 0 ? (
            <div className="bg-white rounded-lg border border-zinc-200 p-6">
              <p className="text-sm text-zinc-500 text-center">
                No impressions recorded for this campaign during the selected date range.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-zinc-200 p-6">
                <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                  Summary
                </h2>
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
