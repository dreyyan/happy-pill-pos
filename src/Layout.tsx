import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./context/useAuth";

// [IMPORT] Components
import Header from "./components/Header";
import Modal from "./components/Modal";

export default function Layout() {
  const location = useLocation();
  const hideHeader = ["/login", "/login/adviser", "/forgot-password"].some(path =>
  location.pathname.startsWith(path)
  );

  const { showTokenExpiredModal, setShowTokenExpiredModal, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen flex-1">
      {!hideHeader && <Header />}
      <main className="flex-grow">
        <Outlet />
      </main>

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