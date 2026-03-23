// [IMPORT] Navigation
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// [IMPORT] Routes
import AdminLogin from "./pages/auth/AdminLogin";
import CashierLogin from "./pages/auth/CashierLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CashierDashboard from "./pages/admin/CashierDashboard";

function App() {
  return (
    <Routes>
        <Route path="/" element={<Navigate to="/login/admin" replace />} />

        {/* Authentication */}
        <Route path="/login/admin" element={<AdminLogin/>} />
        <Route path="/login/cashier" element={<CashierLogin/>} />

        {/* Dashboard */}
        <Route path="/admin/dashboard" element={<AdminDashboard/>} />
        <Route path="/cashier/dashboard" element={<CashierDashboard/>} />
    </Routes>
  );
}

export default App;