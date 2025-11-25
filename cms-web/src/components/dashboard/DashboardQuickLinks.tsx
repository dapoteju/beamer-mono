import { useNavigate } from "react-router-dom";

interface QuickLinkItem {
  label: string;
  to: string;
  description: string;
  icon: string;
}

const quickLinks: QuickLinkItem[] = [
  {
    label: "View Campaigns",
    to: "/campaigns",
    description: "Manage your advertising campaigns",
    icon: "📊",
  },
  {
    label: "View Screens",
    to: "/screens",
    description: "Manage screens and players",
    icon: "📺",
  },
  {
    label: "Compliance Queue",
    to: "/compliance",
    description: "Review pending approvals",
    icon: "✅",
  },
  {
    label: "Open Reports",
    to: "/reporting",
    description: "View campaign reports",
    icon: "📈",
  },
  {
    label: "Inventory Map",
    to: "/inventory/map",
    description: "View all screens on map",
    icon: "🗺️",
  },
];

export default function DashboardQuickLinks() {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-4">Quick Links</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickLinks.map((link) => (
          <button
            key={link.to}
            onClick={() => navigate(link.to)}
            className="flex flex-col items-center p-4 border border-zinc-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-center"
          >
            <span className="text-2xl mb-2">{link.icon}</span>
            <span className="text-sm font-medium text-zinc-900">{link.label}</span>
            <span className="text-xs text-zinc-500 mt-1">{link.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
