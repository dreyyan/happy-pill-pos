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
import AdminOrders from "./pages/admin/AdminOrders";
import Home from "./pages/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      {/* Authentication */}
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/cashier" element={<CashierLogin />} />

      {/* Protected Routes */}
      <Route element={<Layout />}>
        {/* [ROUTES] Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/cashiers" element={<AdminCashiers />} />
        <Route path="/admin/items" element={<AdminItems />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/categories" element={<AdminCategories />} />

        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        
        {/* [ROUTES] Cashier */}
        <Route path="/cashier/dashboard" element={<CashierDashboard />} />
      </Route>

      {/* [OPTIONAL] Catch all/404 redirect */}
      {/* <Route path="*" element={<Navigate to="/login/admin" replace />} /> */}
    </Routes>
  );
}

export default App;