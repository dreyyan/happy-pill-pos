// [IMPORT] React & Hooks
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../../hooks/usePageTitle";

// [IMPORT] Components
import Modal from "../../components/Modal";
import InputField from "../../components/InputField";
import PrimaryButton from "../../components/PrimaryButton";
import ImageHeader from "../../components/ImageHeader";
import ThemeAndLogoForm from "../../components/ThemeAndLogoForm";

const AdminOnboarding = () => {
  const navigate = useNavigate();
  usePageTitle("Setup | POS System");

  // [STATES] Form fields
  const [businessName, setBusinessName] = useState("");
  const [themeColor, setThemeColor] = useState("#FFDD00"); // default color
  const [logo, setLogo] = useState("☕"); // default preset icon

  // [STATES] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState<"default" | "error" | "success" | "info" | "warning">("default");
  const [modalMessage, setModalMessage] = useState("");
  const [isCancelable, setIsCancelable] = useState(true);
  const [redirectOnConfirm, setRedirectOnConfirm] = useState(false);

  const handleSaveConfig = async () => {
    // Validate business name
    if (!businessName.trim()) {
      setModalTitle("Business Name Required");
      setModalMessage("Please enter your business name to continue.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    // Validate theme color
    if (!themeColor.trim()) {
      setModalTitle("Theme Color Required");
      setModalMessage("Please select a theme color to continue.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    // Validate logo
    if (!logo.trim()) {
      setModalTitle("Logo Required");
      setModalMessage("Please select a logo preset to continue.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
      return;
    }

    try {
      // First-time onboarding does NOT need a token
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, themeColor, logo }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save configuration");
      }

      // Success modal
      setModalTitle("Configuration Saved");
      setModalType("success");
      setModalMessage(
        "Your business configuration has been saved successfully. Redirecting to Admin Login..."
      );
      setIsCancelable(false);
      setRedirectOnConfirm(true);
      setShowModal(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setModalTitle("Save Failed");
      setModalMessage(err.message || "Something went wrong while saving your configuration. Please try again.");
      setIsCancelable(false);
      setRedirectOnConfirm(false);
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* [COMPONENT] Image Header */}
      <ImageHeader />

      {/* [CONTENT] Page Body */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        {/* [COMPONENT] Modal */}
        {showModal && (
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={() => {
              setShowModal(false);
              if (redirectOnConfirm) navigate("/login/admin");
            }}
            title={modalTitle}
            message={modalMessage}
            type={modalType}
            closeOnBackdrop={false}
            isCancelable={isCancelable}
          />
        )}

        {/* Onboarding Form */}
        <div className="bg-bg-100 w-full max-w-md sm:max-w-lg lg:max-w-md px-6 py-8 sm:px-8 sm:py-10 rounded-xl shadow-lg">
          {/* [UI] Form Title */}
          <h1 className="text-text-900 text-center text-2xl sm:text-2xl">
            Welcome!
          </h1>
          <p className="text-caption text-center mt-2 mb-6">
            Please set up your business details to get started...
          </p>

          {/* [SECTION] Input Fields */}
          <div className="flex flex-col gap-y-4">
            <InputField
              label="Business Name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. John's Restobar"
              iconSrc="store-icon.svg"
            />

            {/* [COMPONENT] Theme and Logo Selector */}
            <ThemeAndLogoForm
              themeColor={themeColor}
              logo={logo}
              onThemeChange={setThemeColor}
              onLogoChange={setLogo}
            />
          </div>

          {/* [PRIMARY BUTTON] Save Config */}
          <div className="mt-6">
            <PrimaryButton text="Save & Continue" onClick={handleSaveConfig} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOnboarding;