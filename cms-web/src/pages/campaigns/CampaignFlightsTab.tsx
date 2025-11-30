import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { type Flight } from "../../api/campaigns";
import { Sheet, SheetContent } from "../../components/ui/Sheet";
import FlightEditorDrawer from "../../components/flights/FlightEditorDrawer";

interface CampaignFlightsTabProps {
  campaignId: string;
  flights: Flight[];
  onFlightChange: () => void;
}

export default function CampaignFlightsTab({ campaignId, flights, onFlightChange }: CampaignFlightsTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const hasProcessedFlightParam = useRef(false);

  useEffect(() => {
    if (hasProcessedFlightParam.current) return;
    
    const flightParam = searchParams.get("flight");
    if (flightParam && flights.some(f => f.id === flightParam)) {
      hasProcessedFlightParam.current = true;
      setSelectedFlightId(flightParam);
      setDrawerOpen(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("flight");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, flights, setSearchParams]);

  function openFlight(flightId?: string) {
    setSelectedFlightId(flightId ?? null);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedFlightId(null);
  }

  function handleFlightSaved() {
    handleCloseDrawer();
    onFlightChange();
  }

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-purple-100 text-purple-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900">Flights</h2>
        <button
          onClick={() => openFlight()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Flight
        </button>
      </div>

      {flights.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-lg p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-zinc-600 mb-4">
            No flights created yet. Add your first flight to get started.
          </p>
          <button
            onClick={() => openFlight()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add Flight
          </button>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Flight Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Start
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  End
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Target Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {flights.map((flight) => (
                <tr
                  key={flight.id}
                  className="hover:bg-zinc-50 cursor-pointer"
                  onClick={() => openFlight(flight.id)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">
                    {flight.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(
                        flight.status
                      )}`}
                    >
                      {flight.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {formatDateTime(flight.startDatetime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700">
                    {formatDateTime(flight.endDatetime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 capitalize">
                    {flight.targetType.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFlight(flight.id);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <FlightEditorDrawer
            campaignId={campaignId}
            flightId={selectedFlightId}
            onClose={handleCloseDrawer}
            onSuccess={handleFlightSaved}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
