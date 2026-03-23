// [IMPORT] Navigation
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// [IMPORT] Routes
import AdminLogin from "./pages/auth/AdminLogin";
import CashierLogin from "./pages/auth/CashierLogin";

function App() {
  return (
    <Routes>
        <Route path="/" element={<Navigate to="/login/admin" replace />} />

        {/* Authentication */}
        <Route path="/login/admin" element={<AdminLogin/>} />
        <Route path="/login/cashier" element={<CashierLogin/>} />
    </Routes>
  );
}

export default App;