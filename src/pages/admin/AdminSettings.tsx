// [IMPORT] Hooks
import { useState, useEffect } from "react";

// [IMPORT] Components
import Skeleton from "../../components/Skeleton";
import InputField from "../../components/InputField";
import Modal from "../../components/Modal";
import React from "react";

// ? [INTERFACES]
interface SettingsForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const AdminSettings = () => {
  // [STATES]
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  const [form, setForm] = useState<SettingsForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // *[EFFECT] Reset loading (no API fetch needed now)
  useEffect(() => setLoading(false), []);

  // [HANDLE] Form change
  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // [HANDLE] Save password
  const handleSave = async () => {
    // Trim all fields first
    const currentPassword = form.currentPassword.trim();
    const newPassword = form.newPassword.trim();
    const confirmPassword = form.confirmPassword.trim();

    // ![VALIDATION] All fields required
    if (!currentPassword || !newPassword || !confirmPassword) {
        setModalTitle("Validation Error");
        setModalMessage("All password fields are required.");
        setModalType("error");
        setShowModal(true);
        return;
    }

    // ![VALIDATION] Password mismatch
    if (newPassword !== confirmPassword) {
        setModalTitle("Validation Error");
        setModalMessage("New password and confirmation do not match.");
        setModalType("error");
        setShowModal(true);
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        setLoading(true);

        // [SECTION] Update password
        const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/change-password`,
        {
            method: "PUT",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
            }),
        }
        );

        const data = await res.json();

        // ![ERROR] If backend returns error, show it
        if (!data.success) {
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "") || "Failed to update password";
        throw new Error(cleanMessage);
        }

        // *[SUCCESS]
        setModalTitle("Success");
        setModalMessage("Password updated successfully!");
        setModalType("success");
        setShowModal(true);

        // Clear password fields
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
    console.error(err);

    // Use backend error message if available
    let message = "Failed to update password.";
    if (err instanceof Error) {
      message = err.message;
    }

      setModalTitle("Error");
      setModalMessage(message);
      setModalType("error");
      setShowModal(true);
    } finally {
        setLoading(false);
    }
  };

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-6 px-4 flex flex-col items-center gap-y-4">
      {/* Modal */}
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

      {/* Password Card */}
      <div className="w-full max-w-md bg-bg-100 border border-bg-300 rounded-lg shadow-sm p-5 space-y-4">
        <h1 className="font-h2 font-font-extrabold text-text-900">
            Settings
        </h1>

        <h3 className="text-text-700">Security</h3>

        {/* Security / Password */}
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-2 rounded-md bg-green-600 hover:opacity-90 text-white font-roboto font-medium transition"
        >
          Update Password
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;