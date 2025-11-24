import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type NavItem = {
  to: string;
  label: string;
};

const baseNavItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/screens", label: "Screens & Players" },
  { to: "/organisations", label: "Organisations" },
  { to: "/reporting", label: "Reporting" },
];

const navItemsByOrgType: Record<string, NavItem[]> = {
  beamer_internal: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/screens", label: "Screens & Players" },
    { to: "/publishers", label: "Publishers" },
    { to: "/advertisers", label: "Advertisers" },
    { to: "/organisations", label: "Organisations" },
    { to: "/reporting", label: "Reporting" },
  ],
  advertiser: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/campaigns", label: "Campaigns" },
    { to: "/reporting", label: "Reporting" },
  ],
  publisher: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/screens", label: "Screens & Players" },
    { to: "/reporting", label: "Reporting" },
  ],
};

function Sidebar() {
  const { user } = useAuthStore();
  
  const navItems = user?.orgType
    ? navItemsByOrgType[user.orgType] || baseNavItems
    : baseNavItems;

  return (
    <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col">
      <div className="h-16 flex items-center px-4 text-lg font-bold border-b border-zinc-800">
        <span className="text-cyan-400">Beamer</span> CMS
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm rounded-r-full ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-800/60"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "ops":
        return "bg-blue-100 text-blue-700";
      case "viewer":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getOrgTypeBadgeColor = (orgType: string) => {
    switch (orgType) {
      case "beamer_internal":
        return "bg-cyan-100 text-cyan-700";
      case "advertiser":
        return "bg-green-100 text-green-700";
      case "publisher":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatOrgType = (orgType: string) => {
    switch (orgType) {
      case "beamer_internal":
        return "Internal";
      case "advertiser":
        return "Advertiser";
      case "publisher":
        return "Publisher";
      default:
        return orgType;
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white">
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <div className="font-semibold text-zinc-900">{user?.orgName}</div>
          {user?.orgType && (
            <div className="text-xs text-zinc-500">
              {formatOrgType(user.orgType)}
            </div>
          )}
        </div>
        {user?.orgType && (
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${getOrgTypeBadgeColor(
              user.orgType
            )}`}
          >
            {formatOrgType(user.orgType)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <div className="font-medium text-zinc-900">
              {user?.fullName || user?.email}
            </div>
            <div className="text-xs text-zinc-500">{user?.email}</div>
          </div>
          {user?.role && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {user.role}
            </span>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <div className="h-screen flex bg-zinc-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
