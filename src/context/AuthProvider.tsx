// [IMPORT] Hooks
import React from "react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContextOnly";

// [IMPORT] Components
import Modal from "../components/Modal";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // [STATES]
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const navigate = useNavigate();

  // [HANDLE] Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setShowTokenExpiredModal(false);
    navigate("/");
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