// [IMPORT] React & Hooks
import React, { type ReactNode } from "react";
import { useAuth } from "../context/useAuth";

// [COMPONENT] PrivateRoute
interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { setShowTokenExpiredModal } = useAuth();
  const token = localStorage.getItem("token");

  // ! [CHECK] If missing token, show modal & prevent render
  if (!token) {
    setShowTokenExpiredModal(true);
    return null; // stop rendering protected page
  }

  // * [SUCCESS] Else, render page if token exists
  return <>{children}</>;
};

export default PrivateRoute;