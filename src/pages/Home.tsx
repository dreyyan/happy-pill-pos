// [IMPORT] Hooks
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";

// [IMPORT] Components
import PrimaryButton from "../components/PrimaryButton";
import ImageHeader from "../components/ImageHeader";
import TrustBadge from "../components/TrustBadge";
import SecondaryButton from "../components/SecondaryButton";

// [IMPORT] Helpers
import { adjustThemeColor } from "../utils/helpers";

const Home = () => {
  const navigate = useNavigate();

  // [STATES] Config
  const [businessName, setBusinessName] = useState("POS System");
  const [themeColor, setThemeColor] = useState("#FFDD00");
  const [loadingConfig, setLoadingConfig] = useState(true);

  // * [EFFECT] Fetch admin config (first-time)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/config/first-time`);
        const data = await res.json();

        // * Config exists → set values
        if (res.ok && data.success && data.data) {
          if (data.data.exists) {
            setBusinessName(data.data.businessName || "POS System");
            setThemeColor(data.data.themeColor || "#FFDD00");
          }
        }
      } catch (err) {
        console.error("Error fetching admin config:", err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfig();
  }, []);

  // * [UPDATE PAGE TITLE]
  usePageTitle(`${businessName} | Smart P.O.S.`);

  // * [LOADING STATE]
  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* [COMPONENT] Image Header */}
      <ImageHeader themeColor={adjustThemeColor(themeColor)} businessName={businessName} />

      {/* [SECTION] Hero Section */}
      <section className="bg-surface min-h-[calc(100vh-120px)] flex items-center justify-center px-6 py-8">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12 items-center">

          {/* [L] Hero Section Header */}
          <div>
            {/* [UI] Hero Title */}
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              <span style={{ color: adjustThemeColor(themeColor) }}>
                {businessName} POS
              </span>
            </h1>

            {/* [UI] Hero Description */}
            <p className="mt-6 text-label text-text-800">
              Fast. Reliable. Easy to use.  
              Manage orders, inventory, sales, and staff — all in one place.
            </p>

            {/* [SECTION] Primary Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <PrimaryButton
                text="Admin Login"
                onClick={() => navigate("/login/admin")}
                color={adjustThemeColor(themeColor)}
              />
              <SecondaryButton
                text="Cashier Login"
                onClick={() => navigate("/login/cashier")}
              />
            </div>

            {/* [SECTION] Trust Badges */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <TrustBadge
                iconSrc="/cashier-icon.svg"
                title="Fast Checkout"
                description="Serve customers quickly with an optimized POS flow."
                color={adjustThemeColor(themeColor)}
              />
              <TrustBadge
                iconSrc="/inventory-icon.svg"
                title="Inventory Tracking"
                description="Real-time stock updates to avoid shortages."
                color={adjustThemeColor(themeColor)}
              />
              <TrustBadge
                iconSrc="/report-icon.svg"
                title="Sales Reports"
                description="Understand your business with detailed analytics."
                color={adjustThemeColor(themeColor)}
              />
            </div>
          </div>

          {/* [R] Hero Visuals */}
          <div className="flex justify-center">
            <div
              className="relative rounded-xl shadow-2xl p-10 w-full max-w-md"
              style={{ background: `linear-gradient(to top right, ${adjustThemeColor(themeColor)}, #000000)` }}
            >
              {/* [UI] Logo */}
              <div className="flex justify-center mb-6">
                <img
                  src="/happy-pill-cafe-logo.svg"
                  alt={`${businessName} Logo`}
                  className="h-24"
                />
              </div>

              {/* [UI] Tagline */}
              <p className="italic text-white text-center text-lg font-semibold">
                "Your daily dose of productivity."
              </p>

              {/* [UI] Pill Gradient Decorations */}
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