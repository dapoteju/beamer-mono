import { createBrowserRouter, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import AppLayout from "../layouts/AppLayout";
import { useAuthStore } from "../store/authStore";

import Dashboard from "../pages/Dashboard";
import Campaigns from "../pages/Campaigns";
import Screens from "../pages/Screens";
import ScreenDetail from "../pages/ScreenDetail";
import Organisations from "../pages/Organisations";
import OrganisationDetail from "../pages/OrganisationDetail";
import Reporting from "../pages/Reporting";
import Login from "../pages/Login";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OrgTypeGuard({
  children,
  allowedOrgTypes,
}: {
  children: ReactElement;
  allowedOrgTypes: string[];
}) {
  const { user, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100">
        <div className="text-zinc-600">Loading...</div>
      </div>
    );
  }

  if (!user || !allowedOrgTypes.includes(user.orgType)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "campaigns", element: <Campaigns /> },
      {
        path: "screens",
        element: (
          <OrgTypeGuard allowedOrgTypes={["beamer_internal", "publisher"]}>
            <Screens />
          </OrgTypeGuard>
        ),
      },
      {
        path: "screens/:id",
        element: (
          <OrgTypeGuard allowedOrgTypes={["beamer_internal", "publisher"]}>
            <ScreenDetail />
          </OrgTypeGuard>
        ),
      },
      {
        path: "organisations",
        element: (
          <OrgTypeGuard allowedOrgTypes={["beamer_internal"]}>
            <Organisations />
          </OrgTypeGuard>
        ),
      },
      {
        path: "organisations/:id",
        element: (
          <OrgTypeGuard allowedOrgTypes={["beamer_internal"]}>
            <OrganisationDetail />
          </OrgTypeGuard>
        ),
      },
      { path: "reporting", element: <Reporting /> },
    ],
  },
]);
