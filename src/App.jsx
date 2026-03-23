import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/Dashboard";
import Orgs from "./pages/orgs/Orgs";
import Users from "./pages/users/Users";
import Permissions from "./pages/permissions/Permissions";
import Branches from "./pages/branches/Branches";
import Menu from "./pages/menu/Menu";
import Inventory from "./pages/inventory/Inventory";
import Recipes from "./pages/recipes/Recipes";
import Shifts from "./pages/shifts/Shifts";
import Analytics from "./pages/analytics/Reports"

export default function App() {
  return (
    <AuthProvider>  
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index          element={<Dashboard />} />
            <Route path="orgs"    element={<Orgs />} />
            <Route path="users"   element={<Users />} />
            <Route path="branches" element={<Branches />} />
            <Route path="menu"    element={<Menu />} />
            <Route path="permissions/:userId" element={<Permissions />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="recipes" element={<Recipes/>}/>
            <Route path="shifts" element={<Shifts/>}/>
            <Route path="*"       element={<Navigate to="/" replace />} />
            <Route path="reports-dashboard" element={<Analytics/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}