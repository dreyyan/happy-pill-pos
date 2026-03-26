// [IMPORT] React
import React from "react";
import { Routes, Route } from "react-router-dom";

// [IMPORT] Pages
import Home from "./pages/Home";

// [IMPORT] Pages: Admin
import AdminLogin from "./pages/auth/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminItems from "./pages/admin/AdminItems";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCashiers from "./pages/admin/AdminCashiers";
import AdminSalesReport from "./pages/admin/AdminSalesReport";
import AdminProfile from "./pages/admin/AdminProfile";
import AdminSettings from "./pages/admin/AdminSettings";

// [IMPORT] Pages: Cashier
import CashierLogin from "./pages/auth/CashierLogin";
import CashierDashboard from "./pages/admin/CashierDashboard";

// [IMPORT] Context & Layout
import PrivateRoute from "./context/PrivateRoute";
import Layout from "./Layout";

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
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/cashiers"
          element={
            <PrivateRoute>
              <AdminCashiers />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/items"
          element={
            <PrivateRoute>
              <AdminItems />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/transactions"
          element={
            <PrivateRoute>
              <AdminTransactions />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <PrivateRoute>
              <AdminOrders />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/inventory"
          element={
            <PrivateRoute>
              <AdminInventory />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <PrivateRoute>
              <AdminCategories />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/sales-report"
          element={
            <PrivateRoute>
              <AdminSalesReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <PrivateRoute>
              <AdminProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute>
              <AdminSettings />
            </PrivateRoute>
          }
        />

        {/* [ROUTES] Cashier */}
        <Route
          path="/cashier/dashboard"
          element={
            <PrivateRoute>
              <CashierDashboard />
            </PrivateRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;