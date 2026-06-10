import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./routes/App";
import { Dashboard } from "./routes/Dashboard";
import { NotFound } from "./routes/NotFound";
import { PublicSite } from "./routes/PublicSite";
import { ResetPassword } from "./routes/ResetPassword";
import "./styles/branding.css";
import "./styles/index.css";
import "./styles/public.css";
import "./styles/dashboard-branding.css";
import "./styles/dashboard.css";
import "./styles/explorer.css";
import Explorer from "./routes/Explorer";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Explorer /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "reset-password", element: <ResetPassword /> },
      { path: "*", element: <NotFound /> }
    ]
  }
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
