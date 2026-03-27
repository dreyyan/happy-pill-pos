import React from "react";
import { Outlet, useLocation } from "react-router-dom";

// [IMPORT] Components
import Header from "./components/Header";

export default function Layout() {
  const location = useLocation();
  const hideHeader = ["/login", "/login/adviser", "/forgot-password"].some(path =>
  location.pathname.startsWith(path)
  );

  return (
    <div className="flex flex-col min-h-screen flex-1">
      {!hideHeader && <Header />}
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}