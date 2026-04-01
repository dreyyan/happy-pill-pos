// CashierDashboard.tsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import React, { useState, useEffect } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";

// Components
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import DashboardItem from "../../components/DashboardItem";
import DashboardButton from "../../components/DashboardButton";

// Interfaces
interface Profile {
  name: string;
  email: string;
}

interface DashboardSummary {
  cashierProfile: Profile;
  totalOrdersToday: number;
  totalTransactions: number;
  salesToday: number;
  itemsSoldToday: number;
}

const CashierDashboard = () => {
  const navigate = useNavigate();
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Dashboard: Cashier | Happy-Pill Cafe");

  // Profile & Loading
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard Data
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalSalesToday, setTotalSalesToday] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalTitle] = useState("");
  const [modalMessage] = useState("");
  const [isCancelable] = useState(true);
  const [redirectOnConfirm] = useState(false);

  // [STATES] Config
  const [businessName, setBusinessName] = useState("POS System");

  // * [EFFECT] Fetch config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/config/first-time`);
        const data = await res.json();

        // If response is not OK or missing data → do nothing
        if (!res.ok || !data.success || !data.data) return;

        const { exists, businessName: fetchedName } = data.data;

        // If config does not exist → do nothing
        if (!exists) return;

        // Set business name, fallback to default
        setBusinessName(fetchedName || "POS System");

      } catch (err) {
        console.error("Error fetching admin config:", err);
      }
    };

    fetchConfig();
  }, []); // no need for navigate here, unless you redirect inside

  // * [UPDATE PAGE TITLE]
  usePageTitle(`Dashboard: Cashier | ${businessName}`);

  // Fetch Dashboard Summary
  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchDashboard = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/cashier/dashboard/summary`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          return;
        }

        const data: { success: boolean; data?: DashboardSummary } = await res.json();

        if (!data.success || !data.data) {
          console.error("Dashboard fetch error:", data);
          localStorage.removeItem("token");
          setShowTokenExpiredModal(true);
          return;
        }

        const summary = data.data;

        // Safely set state with fallbacks
        setProfile(summary.cashierProfile ?? { name: "Cashier", email: "" });
        setTotalOrders(summary.totalOrdersToday ?? 0);
        setTotalTransactions(summary.totalTransactions ?? 0);
        setTotalSalesToday(summary.salesToday ?? 0);
        setTotalItemsSold(summary.itemsSoldToday ?? 0);
      } catch (err) {
        console.error("Failed to fetch dashboard:", err);
        localStorage.removeItem("token");
        setShowTokenExpiredModal(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [setShowTokenExpiredModal]);

  if (loading) return <Skeleton />;

  return (
    <div className="py-6 px-4 space-y-4 bg-surface">
      {/* Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            if (redirectOnConfirm) navigate("/cashier/dashboard");
          }}
          title={modalTitle}
          message={modalMessage}
          closeOnBackdrop={false}
          isCancelable={isCancelable}
        />
      )}

      {/* Page Title */}
      <div className="bg-primary-800 py-3 rounded-lg">
        <h1 className="text-center text-text-50">Cashier Dashboard</h1>
      </div>

      {/* Personal Information */}
      <div className="flex flex-col justify-center bg-gradient-to-tr from-primary-500 to-primary-700 rounded-md px-5 py-4 shadow-md">
        <p className="text-h2 font-bold mb-2 text-text-50">{profile?.name}</p>
        <p className="text-h5 font-medium text-text-100">Cashier</p>
      </div>

      {/* Dashboard Overview */}
      <div className="bg-bg-100 border border-bg-300/60 rounded-lg px-5 py-6 gap-x-3 shadow-md">
        <h2 className="mb-3">Overview</h2>
        <div className="space-y-2">
          <DashboardItem iconSrc="/orders-icon.svg" text="Total Orders" value={totalOrders} />
          <DashboardItem iconSrc="/transaction-icon.svg" text="Total Transactions" value={totalTransactions} />
          <DashboardItem
            iconSrc="/sales-today-icon.svg"
            text="Sales Today"
            value={`₱${(totalSalesToday ?? 0).toFixed(2)}`}
          />
          <DashboardItem iconSrc="/item-icon.svg" text="Items Sold Today" value={totalItemsSold} />
        </div>
      </div>

      {/* Dashboard Buttons */}
      <div className="grid grid-cols-2 gap-6 px-4">
        <DashboardButton
          iconSrc="/orders-icon.svg"
          text="Orders"
          colorFrom="#3B82F6"
          colorTo="#1D4ED8"
          to={"/cashier/orders"}
        />
        <DashboardButton
          iconSrc="/transaction-icon.svg"
          text="Transactions"
          colorFrom="#F59E0B"
          colorTo="#B45309"
          to={"/cashier/transactions"}
        />
        <DashboardButton
          iconSrc="/item-icon.svg"
          text="Items"
          colorFrom="#8B5CF6"
          colorTo="#6D28D9"
          to={"/cashier/items"}
        />
        <DashboardButton
          iconSrc="/sales-report-icon.svg"
          text="Sales Report"
          colorFrom="#10B981"
          colorTo="#047857"
          to={"/cashier/sales-report"}
        />
      </div>
    </div>
  );
};

export default CashierDashboard;