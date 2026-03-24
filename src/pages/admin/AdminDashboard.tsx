// [IMPORT] Hooks
import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// [IMPORT] Components
import Modal from "../../components/Modal";
import DashboardButton from "../../components/DashboardButton";
import DashboardItem from "../../components/DashboardItem";
import Skeleton from "../../components/Skeleton";

// ? [INTERFACES]
interface Profile {
  name: string;
  email: string;
}

interface DashboardSummary {
  adminProfile: Profile;
  totalAdmins: number;
  totalCashiers: number;
  totalItems: number;
  totalTransactions: number;
  totalInventory: number;
}

const AdminDashboard = () => {
  const { setShowTokenExpiredModal } = useAuth();
  const navigate = useNavigate();

  // [STATE] Profile
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // [STATES] Dashboard Information
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [totalCashiers, setTotalCashiers] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);

  // [STATES] Modal  
  const [showModal, setShowModal] = useState(false);
  const [modalTitle] = useState("");
  const [modalMessage] = useState("");
  const [isCancelable] = useState(true);
  const [redirectOnConfirm] = useState(false);

  // * [EFFECT] Fetch dashboard summary
  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/dashboard/summary`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        // ! [ERROR] Expired token
        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          return;
        }

        const data: { success: boolean; data: DashboardSummary } = await res.json();

        // ! [ERROR] Backend failure response
        if (!data.success) {
          console.error("Dashboard fetch error:", data);
          localStorage.removeItem("token");
          setShowTokenExpiredModal(true);
          return;
        }

        // * [SUCCESS] Map backend response
        setProfile(data.data.adminProfile);
        setTotalAdmins(data.data.totalAdmins);
        setTotalCashiers(data.data.totalCashiers);
        setTotalItems(data.data.totalItems);
        setTotalTransactions(data.data.totalTransactions);
        setTotalInventory(data.data.totalInventory);
      } catch (err) {
        // ![ERROR] Network or server issue
        console.error("Failed to fetch dashboard:", err);
        localStorage.removeItem("token");
        setShowTokenExpiredModal(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [setShowTokenExpiredModal]);

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-6 px-4 space-y-4 bg-surface">
      {/* [COMPONENT] Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            if (redirectOnConfirm) navigate("/admin/dashboard");
          }}
          title={modalTitle}
          message={modalMessage}
          closeOnBackdrop={false}
          isCancelable={isCancelable}
        />
      )}

      {/* [UI] Page Title */}
      <div className="bg-primary-800 py-3 rounded-lg">
        <h1 className="text-center text-text-50">Admin Dashboard</h1>
      </div>

      {/* [SECTION] Personal Information */}
      <div className="flex flex-col justify-center bg-gradient-to-tr from-primary-500 to-primary-700 rounded-md px-5 py-4 shadow-md">
        <p className="text-h2 font-bold mb-2 text-text-50">
          {profile?.name}
        </p>
        <p className="text-h5 font-medium text-text-100">Admin</p>
      </div>

      {/* [SECTION] Dashboard Overview */}
      <div className="bg-bg-100 border border-bg-300/60 rounded-lg px-5 py-6 gap-x-3 shadow-md">
        <h2 className="mb-3">Overview</h2>
        <div className="space-y-2">
          <DashboardItem iconSrc="/admin-icon.svg" text="Total Admins" value={totalAdmins} />
          <DashboardItem iconSrc="/cashier-icon.svg" text="Total Cashiers" value={totalCashiers} />
          <DashboardItem iconSrc="/item-icon.svg" text="Total Items" value={totalItems} />
          <DashboardItem iconSrc="/transaction-icon.svg" text="Total Transactions" value={totalTransactions} />
          <DashboardItem iconSrc="/inventory-icon.svg" text="Total Inventory" value={totalInventory} />
        </div>
      </div>

      {/* [SECTION] Dashboard Buttons */}
      <div className="grid grid-cols-2 gap-6 px-4">
        <DashboardButton
          iconSrc="/cashier-icon.svg"
          text="Cashiers"
          colorFrom="#3B82F6"
          colorTo="#1D4ED8"
          to={"/admin/cashiers"}
        />

        <DashboardButton
          iconSrc="/item-icon.svg"
          text="Items"
          colorFrom="#8B5CF6"
          colorTo="#6D28D9"
          to={"/admin/items"}
        />

        <DashboardButton
          iconSrc="/transaction-icon.svg"
          text="Transactions"
          colorFrom="#F59E0B"
          colorTo="#B45309"
          to={"/admin/transactions"}
        />

        <DashboardButton
          iconSrc="/inventory-icon.svg"
          text="Inventory"
          colorFrom="#10B981"
          colorTo="#047857"
          to={"/admin/inventory"}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;