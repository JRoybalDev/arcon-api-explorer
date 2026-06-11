import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App } from "./routes/App";
import { LoadingScreen } from "./shared/Loading";
import "./styles/branding.css";
import "./styles/index.css";
import "./styles/public.css";
import "./styles/dashboard-branding.css";
import "./styles/dashboard.css";
import "./styles/explorer.css";
import Explorer from "./routes/Explorer";

const queryClient = new QueryClient();
const Dashboard = lazy(() => import("./routes/Dashboard").then((module) => ({ default: module.Dashboard })));
const ResetPassword = lazy(() => import("./routes/ResetPassword").then((module) => ({ default: module.ResetPassword })));
const NotFound = lazy(() => import("./routes/NotFound").then((module) => ({ default: module.NotFound })));

function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingScreen label="Loading page..." />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Explorer /> },
      { path: "dashboard", element: <LazyRoute><Dashboard /></LazyRoute> },
      { path: "reset-password", element: <LazyRoute><ResetPassword /></LazyRoute> },
      { path: "*", element: <LazyRoute><NotFound /></LazyRoute> }
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
