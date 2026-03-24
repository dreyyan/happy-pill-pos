// [IMPORT] React
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// [IMPORT] Pages
import AdminLogin from "./pages/auth/AdminLogin";
import CashierLogin from "./pages/auth/CashierLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CashierDashboard from "./pages/admin/CashierDashboard";

// Layout
import Layout from "./Layout";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminCashiers from "./pages/admin/AdminCashiers";
import AdminItems from "./pages/admin/AdminItems";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminCategories from "./pages/admin/AdminCategories";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login/admin" replace />} />

      {/* Authentication */}
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/cashier" element={<CashierLogin />} />

      {/* Protected Routes */}
      <Route element={<Layout />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/cashier/dashboard" element={<CashierDashboard />} />
      </Route>

      {/* [OPTIONAL] Catch all/404 redirect */}
      <Route path="*" element={<Navigate to="/login/admin" replace />} />
    </Routes>
  );
}

export default App;