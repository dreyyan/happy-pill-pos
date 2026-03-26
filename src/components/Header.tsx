// [IMPORT] Hooks
import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// [IMPORT] Components
import SidebarLink from "./SidebarLink";

const Header = () => {
  const navigate = useNavigate();

  // [STATES]
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));

  // [STATES] User Profile
  const [profileName, setProfileName] = useState<string>(() => {
    return localStorage.getItem("name") || "";
  });
  const [role, setRole] = useState<"Admin" | "Cashier" | "">(() => {
    return (localStorage.getItem("role") as "Admin" | "Cashier") || "";
  });

  // [HANDLE] Toggle sidebar
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  // [HANDLE] Close sidebar
  const closeSidebar = () => setIsSidebarOpen(false);

  // [HANDLE] Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setRole("");
    setProfileName("");
    closeSidebar();
    navigate(`/login/${role.toLowerCase()}`);
  };

  // * [EFFECT] Fetch profile on mount or when logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const storedRole = localStorage.getItem("role") || "";

        // Determine correct endpoint
        let endpoint = "";
        if (storedRole === "Admin") endpoint = "/api/admin/profile";
        else if (storedRole === "Cashier") endpoint = "/api/cashier/profile";
        else return handleLogout();

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (res.status === 401) {
          handleLogout();
          return;
        }

        const data = await res.json();
        if (!data.success || !data.data) {
          console.error("Failed to fetch profile", data);
          handleLogout();
          return;
        }

        setProfileName(data.data.name);
        setRole(data.data.role === "ADMIN" ? "Admin" : "Cashier");
        setIsLoggedIn(true);

      } catch (err) {
        console.error("Error fetching profile:", err);
        handleLogout();
      }
    };

    fetchProfile();
  }, []);

  return (
    <>
      {/* [HEADER] Top Bar */}
      <header className="flex justify-between items-center px-6 py-4 bg-primary-700">
        {/* [BUTTON] Burger Menu */}
        {isLoggedIn && (
          <button onClick={toggleSidebar} className="size-8 cursor-pointer">
            <img src="/burger-menu-icon.svg" alt="Burger Menu Icon" />
          </button>
        )}

        {/* [UI] Logo */}
        <button onClick={() => navigate("/")} className="flex justify-center items-center gap-x-2 cursor-pointer">
          <p className="text-h4 font-bold text-text-50">
            Happy-Pill Cafe
          </p>
          <img src="/happy-pill-cafe-logo.svg" className="h-7" />
        </button>
      </header>

      {/* [UI] Overlay */}
      {isSidebarOpen && (
        <div onClick={closeSidebar} className="fixed inset-0 bg-black/40 z-40" />
      )}

      {/* [SIDEBAR] Navigation */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-82
          bg-bg-100 shadow-xl z-50
          transform transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* [SIDEBAR HEADER] Profile Info */}
        <div className="flex items-center bg-gradient-to-tr from-primary-600 to-primary-800 shadow-md px-5 py-6 gap-x-4">
          <div>
            <h2 className="mb-2 text-text-50">{profileName || role}</h2>
            <p className="font-roboto font-semibold text-sm text-text-100">{role}</p>
          </div>
        </div>

        {/* [SIDEBAR MENU] Links */}
        <nav className="flex flex-col p-4 gap-2">
          <SidebarLink
            icon="/dashboard-filled-icon.svg"
            text="Dashboard"
            to={`/${role.toLowerCase()}/dashboard`}
            onClick={closeSidebar}
          />
          {role === "Admin" && (
            <>
              <SidebarLink
                icon="/orders-filled-icon.svg"
                text="Orders"
                to="/admin/orders"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/transaction-filled-icon.svg"
                text="Transactions"
                to="/admin/transactions"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/inventory-filled-icon.svg"
                text="Inventory"
                to="/admin/inventory"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/item-filled-icon.svg"
                text="Items"
                to="/admin/items"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/categories-filled-icon.svg"
                text="Categories"
                to="/admin/categories"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/cashier-filled-icon.svg"
                text="Cashiers"
                to="/admin/cashiers"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/sales-report-filled-icon.svg"
                text="Sales Report"
                to="/admin/sales-report"
                onClick={closeSidebar}
              />
            </>
          )}
          {role === "Cashier" && (
            <>
              <SidebarLink
                icon="/orders-filled-icon.svg"
                text="Orders"
                to="/cashier/orders"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/transaction-filled-icon.svg"
                text="Transactions"
                to="/cashier/transactions"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/inventory-filled-icon.svg"
                text="Inventory"
                to="/cashier/inventory"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/item-filled-icon.svg"
                text="Items"
                to="/cashier/items"
                onClick={closeSidebar}
              />
              <SidebarLink
                icon="/sales-report-filled-icon.svg"
                text="Sales Report"
                to="/cashier/sales-report"
                onClick={closeSidebar}
              />
            </>
          )}
          <SidebarLink
            icon="/profile-filled-icon.svg"
            text="Profile"
            to={`/${role.toLowerCase()}/profile`}
            onClick={closeSidebar}
          />
          <SidebarLink
            icon="/settings-filled-icon.svg"
            text="Settings"
            to={`/${role.toLowerCase()}/settings`}
            onClick={closeSidebar}
          />
          <SidebarLink
            icon="/logout-filled-icon.svg"
            text="Logout"
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}/>
        </nav>
      </aside>
    </>
  );
};

export default Header;