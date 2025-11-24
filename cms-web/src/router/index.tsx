import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";

import Dashboard from "../pages/Dashboard";
import Campaigns from "../pages/Campaigns";
import Screens from "../pages/Screens";
import Organisations from "../pages/Organisations";
import Reporting from "../pages/Reporting";

function FakeProtected({ children }: { children: JSX.Element }) {
  return children; // we'll wire real auth later
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <FakeProtected>
        <AppLayout />
      </FakeProtected>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "campaigns", element: <Campaigns /> },
      { path: "screens", element: <Screens /> },
      { path: "organisations", element: <Organisations /> },
      { path: "reporting", element: <Reporting /> },
    ],
  },
]);
