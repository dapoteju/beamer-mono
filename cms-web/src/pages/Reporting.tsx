import { useNavigate } from "react-router-dom";

export default function Reporting() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Reporting</h1>
      <p className="text-sm text-zinc-600 mb-6">
        Access proof-of-play data and delivery reports.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={() => navigate("/reporting/campaigns")}
          className="bg-white border border-zinc-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">
            Campaign Reports
          </h2>
          <p className="text-sm text-zinc-600">
            View proof-of-play data, impressions by day and region for your
            campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}
