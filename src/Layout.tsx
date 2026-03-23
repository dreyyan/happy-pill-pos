import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/useAuth";

// [IMPORT] Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Modal from "./components/Modal";

export default function Layout() {
  const location = useLocation();
  const hideHeaderFooter =
    location.pathname === "/login/" ||
    location.pathname === "/login/adviser" ||
    location.pathname === "/forgot-password";

  const { showTokenExpiredModal, setShowTokenExpiredModal, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen flex-1">
      {!hideHeaderFooter && <Header />}
      <main className="flex-grow">
        <Outlet />
      </main>
      {!hideHeaderFooter && <Footer />}

      {/* Token Expired Modal using Custom Modal */}
      {showTokenExpiredModal && (
        <Modal
          isOpen={showTokenExpiredModal}
          onClose={() => setShowTokenExpiredModal(false)}
          onConfirm={() => {
            setShowTokenExpiredModal(false);
            logout();
          }}
          title="Session Expired"
          message="Your session has expired. Please log in again."
          type="error"
        />
      )}
    </div>
  );
}