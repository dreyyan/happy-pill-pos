// [IMPORT] Hooks
import React from "react";
import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContextOnly";

// [IMPORT] Components
import Modal from "../components/Modal";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // [STATES]
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const navigate = useNavigate();

  // [EFFECT]
  // 1. Automatically check if token expires
  // 2. Notify user via modal
  // 3. Logout > Redirect to login
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Show modal only if token is missing and role exists
    if (!token && role) {
      // Defer setState to next tick
      const id = setTimeout(() => setShowTokenExpiredModal(true), 0);
      return () => clearTimeout(id);
    }
  }, []);

  // [HANDLE] Logout user
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setShowTokenExpiredModal(false);
    navigate("/login/admin");
  };

  return (
    <AuthContext.Provider
      value={{ showTokenExpiredModal, setShowTokenExpiredModal, logout }}
    >
      {children}

      {/* [UI] Session Expired Modal */}
      <Modal
        isOpen={showTokenExpiredModal}
        onClose={() => {}}
        title="Session Expired"
        message="Your session has expired. Please log in again."
        confirmText="Go to Login"
        type="error"
        isCancelable={false}
        closeOnBackdrop={false}
        onConfirm={logout}
      />
    </AuthContext.Provider>
  );
};