import { useNavigate } from "react-router-dom";
import type { DashboardScreen } from "../../api/dashboard";

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface OfflineScreensWidgetProps {
  screens: DashboardScreen[];
  isLoading: boolean;
  error: boolean;
  onRefetch: () => void;
}

export default function OfflineScreensWidget({
  screens,
  isLoading,
  error,
  onRefetch,
}: OfflineScreensWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">Offline Screens</h2>
        <button
          onClick={() => navigate("/screens")}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all screens
        </button>
      </div>

      {isLoading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-zinc-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-500 text-sm mb-3">Failed to load offline screens</p>
          <button
            onClick={onRefetch}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : screens.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-zinc-600">All screens are online</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Screen
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Publisher
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {screens.map((screen) => (
                <tr key={screen.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">{screen.code}</div>
                    {screen.name && (
                      <div className="text-xs text-zinc-500">{screen.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-zinc-700">{screen.city}</div>
                    <div className="text-xs text-zinc-500">{screen.region}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-700">{screen.publisherOrgName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-500">
                      {formatDateTime(screen.lastHeartbeatAt || screen.lastSeenAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Offline
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => navigate(`/screens/${screen.id}`)}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
