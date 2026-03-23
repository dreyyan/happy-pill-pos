// [IMPORT] Navigation
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// [IMPORT] Routes
import AdminLogin from "./pages/auth/AdminLogin";

function App() {
  return (
    <Routes>
        <Route path="/" element={<Navigate to="/login/admin" replace />} />

        {/* Authentication */}
        <Route path="/login/admin" element={<AdminLogin/>} />
    </Routes>
  );
}

export default App;