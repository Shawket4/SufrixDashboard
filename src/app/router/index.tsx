import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Skeleton } from "@/shared/ui/skeleton";
import { ProtectedRoute } from "./protected-route";
import { Layout } from "@/widgets/layout/layout";

const Login = lazy(() => import("@/pages/auth/login"));
const Dashboard = lazy(() => import("@/pages/dashboard/dashboard"));
const Orgs = lazy(() => import("@/pages/orgs/orgs"));
const Users = lazy(() => import("@/pages/users/users"));
const Branches = lazy(() => import("@/pages/branches/branches"));
const Menu = lazy(() => import("@/pages/menu/menu"));
const Bundles = lazy(() => import("@/pages/bundles/bundles"));
const Inventory = lazy(() => import("@/pages/inventory/inventory"));
const Recipes = lazy(() => import("@/pages/recipes/recipes"));
const Shifts = lazy(() => import("@/pages/shifts/shifts"));
const Orders = lazy(() => import("@/pages/orders/orders"));
const Analytics = lazy(() => import("@/pages/analytics/analytics"));
const Discounts = lazy(() => import("@/pages/discounts/discounts"));
const Permissions = lazy(() => import("@/pages/permissions/permissions"));
const Settings = lazy(() => import("@/pages/settings/settings"));
const PublicMenu = lazy(() => import("@/pages/public-menu/public-menu"));
const MenuAdvisor = lazy(() => import("@/pages/menu-advisor/ui/menu-advisor-dashboard"));
const NotFound = lazy(() => import("@/pages/error/not-found"));

function PageLoader() {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

const wrap = (el: React.ReactNode) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;

const router = createBrowserRouter([
  { path: "/login", element: wrap(<Login />) },
  { path: "/menu/:orgId", element: wrap(<PublicMenu />) },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: wrap(<Dashboard />) },
          { path: "orgs", element: wrap(<Orgs />) },
          { path: "users", element: wrap(<Users />) },
          { path: "branches", element: wrap(<Branches />) },
          { path: "menu", element: wrap(<Menu />) },
          { path: "bundles", element: wrap(<Bundles />) },
          { path: "inventory", element: wrap(<Inventory />) },
          { path: "recipes", element: wrap(<Recipes />) },
          { path: "shifts", element: wrap(<Shifts />) },
          { path: "orders", element: wrap(<Orders />) },
          { path: "analytics", element: wrap(<Analytics />) },
          { path: "discounts", element: wrap(<Discounts />) },
          { path: "permissions", element: wrap(<Permissions />) },
          { path: "permissions/:userId", element: wrap(<Permissions />) },
          { path: "settings", element: wrap(<Settings />) },
          { path: "menu-advisor", element: wrap(<MenuAdvisor />) },
          { path: "*", element: wrap(<NotFound />) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
