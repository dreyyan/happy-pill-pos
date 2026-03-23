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