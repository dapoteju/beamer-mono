import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchFlightById } from "../api/campaigns";

export default function FlightRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: flight, isLoading, error } = useQuery({
    queryKey: ["flight", id],
    queryFn: () => fetchFlightById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (flight) {
      navigate(`/campaigns/${flight.campaignId}?tab=flights&flight=${flight.id}`, {
        replace: true,
      });
    }
  }, [flight, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-600">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading flight...
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || "Failed to load flight";
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {errorMessage}
        </div>
        <button
          onClick={() => navigate("/campaigns")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Return to Campaigns
        </button>
      </div>
    );
  }

  return null;
}
