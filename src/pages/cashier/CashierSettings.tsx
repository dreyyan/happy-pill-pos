// [IMPORT] Hooks
import React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";

// [IMPORT] Components
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import InputField from "../../components/InputField";

// ? [INTERFACES]
interface SettingsForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const CashierSettings = () => {
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Settings: Admin | Happy-Pill Cafe");

  // [STATES] Form
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SettingsForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // [STATES] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  // * [EFFECT] Reset loading
  useEffect(() => setLoading(false), []);

  // [HANDLE] Form change
  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // [HANDLE] Save password
  const handleSave = async () => {
    const { currentPassword, newPassword, confirmPassword } = form;

    // ! [ERROR] Empty input fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      setModalTitle("Incomplete Fields");
      setModalMessage("All password fields are required.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    // ! [ERROR] Password mismatch
    if (newPassword !== confirmPassword) {
      setModalTitle("Passwords Do Not Match");
      setModalMessage("New password and confirmation do not match.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cashier/change-password`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      // ! [ERROR] Expired token
      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();

      // ! [ERROR] Backend failure response
      if (!data.success) {
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "") || "Failed to update password";
        throw new Error(cleanMessage);
      }

      // * [SUCCESS] Password updated
      setModalTitle("Success");
      setModalMessage("Your password has been updated successfully.");
      setModalType("success");
      setShowModal(true);

      // Reset form fields
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      let message = "Failed to update password.";
      let title = "Error";

      if (err instanceof Error) {
        message = err.message;

        // Customize title for known backend errors
        if (message.includes("Current password is incorrect")) {
          title = "Incorrect Password";
          message = "The current password you entered does not match our records. Please try again.";
        } else if (message.includes("New password")) {
          title = "Password Error";
        }
      }

      setModalTitle(title);
      setModalMessage(message);
      setModalType("error");
      setShowModal(true);
    }
  };

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-6 px-4 flex flex-col gap-y-4">
      {/* [COMPONENT] Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={() => setShowModal(false)}
          title={modalTitle}
          message={modalMessage}
          type={modalType}
        />
      )}

      {/* [UI] Page Title */}
      <h1 className="font-h2 font-font-extrabold text-text-900">Settings</h1>

      {/* [SECTION] Settings */}
      <div className="w-full max-w-md bg-bg-100 border border-bg-300 rounded-lg shadow-sm p-5 space-y-4">
        {/* [SECTION] Security */}
        <div className="space-y-3">
          <h3 className="text-text-700">Security</h3>

          {/* [SECTION] Input Fields */}
          <div className="space-y-3">
            <InputField
              label="Current Password"
              type="password"
              value={form.currentPassword}
              onChange={(e) => handleChange("currentPassword", e.target.value)}
            />
            <InputField
              label="New Password"
              type="password"
              value={form.newPassword}
              onChange={(e) => handleChange("newPassword", e.target.value)}
            />
            <InputField
              label="Confirm Password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
            />
          </div>

          {/* [PRIMARY BUTTON] Update Password */}
          <div className="pt-2">
              <button
                  onClick={handleSave}
                  className="flex justify-center items-center gap-x-2 w-full py-3 rounded-md cursor-pointer text-button font-bold bg-green-600 text-text-50 transition-all duration-200 hover:bg-green-700 disabled:opacity-50"
              >   
                  <p className="button text-text-on-primary">Update Password</p>
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashierSettings;