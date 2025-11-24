import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/screens", label: "Screens & Players" },
  { to: "/organisations", label: "Organisations" },
  { to: "/reporting", label: "Reporting" },
];

function Sidebar() {
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
  return (
    <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white">
      <div className="text-sm text-zinc-500">Internal CMS</div>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-600">Signed in as</span>
        <span className="font-medium text-zinc-900">Test User</span>
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
