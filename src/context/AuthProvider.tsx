/* eslint-disable react-hooks/exhaustive-deps */
// [IMPORT] Hooks
import React from "react";
import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContextOnly";

// [IMPORT] Components
import Modal from "../components/Modal";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // [STATES]
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // [EFFECT] Check token on mount or when URL changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // console.log("[AuthProvider] useEffect triggered");
    // console.log("Location:", location.pathname);
    // console.log("Token:", token, "Role:", role);

    // Show modal only if token is missing AND current page is not login
    if (!token && role && !location.pathname.startsWith("/login")) {
      // console.log("[AuthProvider] Showing token expired modal");
      const id = setTimeout(() => setShowTokenExpiredModal(true), 0);
      return () => clearTimeout(id);
    }
  }, [location.pathname]);

  // [HANDLE] Logout user
  const logout = () => {
    const currentRole = localStorage.getItem("role");
    // console.log("[AuthProvider] Logout triggered. Current role:", currentRole);

    // Clear session before redirecting
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setShowTokenExpiredModal(false);

    // Redirect to login based on previous role
    navigate(`/login/${currentRole?.toLowerCase() || "admin"}`);
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