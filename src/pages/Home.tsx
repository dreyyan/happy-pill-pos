// [IMPORT] Hooks
import { useNavigate } from "react-router-dom";
import React from "react";

// [IMPORT] Components
import PrimaryButton from "../components/PrimaryButton";
import ImageHeader from "../components/ImageHeader";
import TrustBadge from "../components/TrustBadge";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div>
      {/* Top image header (same as login) */}
      <ImageHeader />

      {/* HERO SECTION */}
      <section className="bg-surface min-h-[calc(100vh-120px)] flex items-center justify-center px-6 py-16">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">

          {/* LEFT SIDE — TEXT */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-text-900 leading-tight">
              Run Your Cafe <br />
              Smarter with{" "}
              <span className="text-primary-600">
                Happy-Pill POS
              </span>
            </h1>

            <p className="mt-6 text-lg text-text-700">
              Fast. Reliable. Easy to use.  
              Manage orders, inventory, sales, and staff — all in one place.
            </p>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <PrimaryButton
                text="Admin Login"
                onClick={() => navigate("/login/admin")}
              />

              <button
                onClick={() => navigate("/login/cashier")}
                className="px-6 py-3 rounded-md border text-button font-bold text-text-on-primary border-primary-600 text-primary-600 hover:bg-primary-50 transition"
              >
                Cashier Login
              </button>
            </div>

              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <TrustBadge
                  iconSrc="/cashier-icon.svg"
                  title="Fast Checkout"
                  description="Serve customers quickly with an optimized POS flow."
                />

                <TrustBadge
                  iconSrc="/inventory-icon.svg"
                  title="Inventory Tracking"
                  description="Real-time stock updates to avoid shortages."
                />

                <TrustBadge
                  iconSrc="/report-icon.svg"
                  title="Sales Reports"
                  description="Understand your business with detailed analytics."
                />
              </div>
          </div>

          {/* RIGHT SIDE — HERO VISUAL */}
          <div className="flex justify-center">
            <div className="relative bg-gradient-to-tr from-primary-500 to-primary-700 rounded-3xl shadow-2xl p-10 w-full max-w-md">

              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img
                  src="/happy-pill-cafe-logo.svg"
                  alt="Happy-Pill Cafe Logo"
                  className="h-24"
                />
              </div>

              {/* Tagline */}
              <p className="italic text-white text-center text-lg font-semibold">
                "Your daily dose of productivity."
              </p>

              {/* Decorative Pills */}
              <div className="absolute -top-4 -left-4 bg-white/20 rounded-full w-12 h-12 blur-md" />
              <div className="absolute -bottom-4 -right-4 bg-white/20 rounded-full w-16 h-16 blur-md" />
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Home;