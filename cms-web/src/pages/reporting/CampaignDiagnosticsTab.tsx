import { useQuery } from "@tanstack/react-query";
import { getCampaignDiagnosticsReport } from "../../api/reports";

interface CampaignDiagnosticsTabProps {
  campaignId: string;
}

export default function CampaignDiagnosticsTab({ campaignId }: CampaignDiagnosticsTabProps) {
  const { data: diagnostics, isLoading, error } = useQuery({
    queryKey: ["campaignDiagnostics", campaignId],
    queryFn: () => getCampaignDiagnosticsReport(campaignId),
    enabled: !!campaignId,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-zinc-200 p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-zinc-600">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-sm text-red-800">
          {(error as any)?.response?.data?.message || "Failed to load diagnostics"}
        </p>
      </div>
    );
  }

  if (!diagnostics) {
    return null;
  }

  const hasIssues = 
    diagnostics.screens_offline.length > 0 ||
    diagnostics.screens_targeted_but_no_plays.length > 0 ||
    diagnostics.creatives_with_no_plays.length > 0 ||
    diagnostics.missing_approvals.length > 0 ||
    diagnostics.resolution_mismatches.length > 0;

  const hasCriticalIssues = 
    diagnostics.missing_approvals.length > 0 ||
    diagnostics.screens_offline.length > 3;

  const status = hasCriticalIssues ? "critical" : hasIssues ? "warning" : "healthy";

  const statusColor = 
    status === "healthy" ? "bg-green-500" :
    status === "warning" ? "bg-yellow-500" : "bg-red-500";

  const statusBgColor = 
    status === "healthy" ? "bg-green-50 border-green-200" :
    status === "warning" ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  const statusTextColor = 
    status === "healthy" ? "text-green-800" :
    status === "warning" ? "text-yellow-800" : "text-red-800";

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-4 ${statusBgColor}`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
          <span className={`font-semibold capitalize ${statusTextColor}`}>
            Campaign Status: {status}
          </span>
        </div>
        <p className={`mt-2 text-sm ${statusTextColor}`}>
          {status === "healthy" && "All systems operating normally. No issues detected."}
          {status === "warning" && "Some issues detected that may affect delivery. Review the details below."}
          {status === "critical" && "Critical issues detected. Immediate attention required."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase">Offline Screens</p>
          <p className={`text-2xl font-semibold ${diagnostics.screens_offline.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {diagnostics.screens_offline.length}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase">No Plays</p>
          <p className={`text-2xl font-semibold ${diagnostics.screens_targeted_but_no_plays.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {diagnostics.screens_targeted_but_no_plays.length}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase">Unused Creatives</p>
          <p className={`text-2xl font-semibold ${diagnostics.creatives_with_no_plays.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {diagnostics.creatives_with_no_plays.length}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase">Missing Approvals</p>
          <p className={`text-2xl font-semibold ${diagnostics.missing_approvals.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {diagnostics.missing_approvals.length}
          </p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase">Resolution Issues</p>
          <p className={`text-2xl font-semibold ${diagnostics.resolution_mismatches.length > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
            {diagnostics.resolution_mismatches.length}
          </p>
        </div>
      </div>

      {diagnostics.screens_offline.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            Offline Screens
            <span className="ml-2 text-sm font-normal text-red-600">({diagnostics.screens_offline.length})</span>
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            These screens have not sent a heartbeat in the last 2 minutes.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Screen</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Publisher</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {diagnostics.screens_offline.map((screen) => (
                  <tr key={screen.screen_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {screen.name || screen.screen_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.publisher_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.last_seen_at 
                        ? new Date(screen.last_seen_at).toLocaleString()
                        : "Never"
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diagnostics.screens_targeted_but_no_plays.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            Screens Without Plays
            <span className="ml-2 text-sm font-normal text-yellow-600">({diagnostics.screens_targeted_but_no_plays.length})</span>
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            These screens are targeted by flights but have not recorded any plays.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Screen</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Flight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {diagnostics.screens_targeted_but_no_plays.map((screen) => (
                  <tr key={screen.screen_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {screen.name || screen.screen_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {screen.flight_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diagnostics.creatives_with_no_plays.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            Creatives Without Plays
            <span className="ml-2 text-sm font-normal text-yellow-600">({diagnostics.creatives_with_no_plays.length})</span>
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            These creatives have not been played on any screen yet.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Creative</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Flight Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {diagnostics.creatives_with_no_plays.map((creative) => (
                  <tr key={creative.creative_id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">{creative.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600">
                      {creative.flight_id === "not_assigned" ? (
                        <span className="text-red-600">Not assigned to any flight</span>
                      ) : (
                        creative.flight_name
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diagnostics.missing_approvals.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            Missing Approvals
            <span className="ml-2 text-sm font-normal text-red-600">({diagnostics.missing_approvals.length})</span>
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            These creatives are missing required regulatory approvals.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Creative</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {diagnostics.missing_approvals.map((approval, idx) => (
                  <tr key={`${approval.creative_id}-${approval.region}-${idx}`} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">{approval.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                        {approval.region}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {diagnostics.resolution_mismatches.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-200 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">
            Resolution Mismatches
            <span className="ml-2 text-sm font-normal text-yellow-600">({diagnostics.resolution_mismatches.length})</span>
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            These creatives may not display correctly on the targeted screens due to resolution differences.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Screen</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Screen Resolution</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-700 uppercase">Creative Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {diagnostics.resolution_mismatches.map((mismatch, idx) => (
                  <tr key={`${mismatch.screen_id}-${mismatch.creative_id}-${idx}`} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-sm text-zinc-900">
                      {mismatch.screen_id}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-600">
                      {mismatch.screen_resolution}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-yellow-600">
                      {mismatch.creative_resolution}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasIssues && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">All Systems Healthy</h3>
          <p className="text-sm text-green-700">
            No issues detected with this campaign. All screens are online, creatives are approved, and delivery is functioning normally.
          </p>
        </div>
      )}
    </div>
  );
}
