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

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // *[EFFECT] Reset loading (no API fetch needed now)
  useEffect(() => setLoading(false), []);

  // [HANDLE] Form change
  const handleChange = (field: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // [HANDLE] Save password
  const handleSave = async () => {
    // ... existing password logic
  };

  // [HANDLE] CSV selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // [HANDLE] Upload CSV and Auto-Create Accounts
  const handleUploadCsv = async () => {
    if (!csvFile) {
      setModalTitle("Validation Error");
      setModalMessage("Please select a CSV file to upload.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/import-users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      // ![ERROR] If backend returns error
      if (!data.success) {
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "") || "Failed to upload CSV";
        throw new Error(cleanMessage);
      }

      // *[SUCCESS] CSV uploaded
      setModalTitle("Success");
      setModalMessage("Users created successfully from CSV!");
      setModalType("success");
      setShowModal(true);

      setCsvFile(null); // Reset file input
      // @ts-ignore
      document.getElementById("csv-upload")!.value = "";
    } catch (err: unknown) {
      let message = "Failed to upload CSV.";
      if (err instanceof Error) message = err.message;

      setModalTitle("Error");
      setModalMessage(message);
      setModalType("error");
      setShowModal(true);
    } finally {
      setUploading(false);
    }
  };

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-6 px-4 flex flex-col items-center gap-y-6">
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
        <h1 className="font-h2 font-font-extrabold text-text-900">Settings</h1>
        <h3 className="text-text-700">Security</h3>

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

        <button
          onClick={handleSave}
          className="w-full py-2 rounded-md bg-green-600 hover:opacity-90 text-white font-roboto font-medium transition"
        >
          Update Password
        </button>
      </div>

      {/* CSV Upload Card */}
      <div className="w-full max-w-md bg-bg-100 border border-bg-300 rounded-lg shadow-sm p-5 space-y-4">
        <h3 className="text-text-700 font-semibold">Auto-Create Users (CSV)</h3>
        <p className="text-text-500 text-sm">
          Upload a CSV file with columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Role</strong> (Admin or Cashier).
        </p>

        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleCsvChange}
          className="w-full border border-bg-300 rounded-md p-2 text-sm"
        />

        <button
          onClick={handleUploadCsv}
          disabled={uploading}
          className="w-full py-2 rounded-md bg-blue-600 hover:opacity-90 text-white font-roboto font-medium transition"
        >
          {uploading ? "Uploading..." : "Upload CSV & Create Users"}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;