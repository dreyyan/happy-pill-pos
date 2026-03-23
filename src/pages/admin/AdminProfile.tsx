// [IMPORT] Hooks
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// [IMPORT] Components
import Skeleton from "../../components/Skeleton";
import InputField from "../../components/InputField";
import Modal from "../../components/Modal";
import React from "react";

// ?[INTERFACES]
interface AdminProfileData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  role: string;
  isActive: boolean;
  admin: { id: number; userId: number };
}

// ?[FORM INTERFACE]
interface AdminForm {
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
}

const AdminProfile = () => {
  const navigate = useNavigate();

  // [STATES]
  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [form, setForm] = useState<AdminForm>({
    name: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "",
    isActive: true,
  });
  const [originalForm, setOriginalForm] = useState<AdminForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 2;
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  // [HANDLE] Form change
  const handleChange = (field: keyof AdminForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // [HANDLE] Toggle edit mode
  const toggleEdit = () => {
    if (isEditing && originalForm) setForm(originalForm);
    else if (!isEditing) setOriginalForm(form);
    setIsEditing((prev) => !prev);
  };

  // [HANDLE] Pagination
  const nextPage = () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); };
  const prevPage = () => { if (currentPage > 1) setCurrentPage((p) => p - 1); };

  // [HANDLE] Save
  const handleSave = async () => {
    if (!form) return;

    if (!form.name || !form.email) {
      setModalTitle("Validation Error");
      setModalMessage("Name and Email are required.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      setModalTitle("Validation Error");
      setModalMessage("Invalid email format.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "");
        setModalTitle("Save Failed");
        setModalMessage(cleanMessage);
        setModalType("error");
        setShowModal(true);
        return;
      }

      setProfile((prev) => ({ ...prev!, ...data.data }));
      setModalTitle("Success");
      setModalMessage("Profile updated successfully!");
      setModalType("success");
      setShowModal(true);
      setIsEditing(false);
      setOriginalForm(form);

    } catch (err) {
      console.error(err);
      setModalTitle("Error");
      setModalMessage("Something went wrong while saving.");
      setModalType("error");
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // *[EFFECT] Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!data.success) {
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        setProfile(data.data);
        setForm({
          name: data.data.name,
          email: data.data.email,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          role: data.data.role,
          isActive: data.data.isActive,
        });
        setOriginalForm({ ...form });
        setIsAuthenticated(true);

      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // [EFFECT] Redirect if not authenticated
  useEffect(() => {
    if (isAuthenticated === false) navigate("/login/admin");
  }, [isAuthenticated, navigate]);

  if (loading || isAuthenticated === null) return <Skeleton />;

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

      {/* Profile Form */}
      <div className="w-full max-w-md bg-[var(--color-bg-100)] border border-[var(--color-bg-300)] rounded-lg shadow-sm p-5 space-y-3">

        {/* Title of Information Category */}
        <h1 className="font-h2 font-extrabold text-text-900 mb-2">
            Profile
        </h1>

        <h3 className="text-text-700">
          {currentPage === 1 ? "Personal Information" : "Account Information"}
        </h3>

        {/* Pagination */}
        <div className="flex justify-between items-center space-x-4 mt-8">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`text-button px-3 py-2 rounded ${
              currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-primary-600 text-white hover:opacity-90"
            }`}
          >
            &lt; Prev
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`text-button px-3 py-2 rounded ${
              currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-primary-600 text-white hover:opacity-90"
            }`}
          >
            Next &gt;
          </button>
        </div>

        <hr className="text-text-300 my-4"/>

        {/* Edit / Save Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={toggleEdit}
            className="font-semibold px-4 py-2 bg-primary-600 text-white rounded flex items-center gap-2"
          >
            {isEditing ? "Cancel" : "Edit"}
            {!isEditing && <img src="/edit-icon.svg" alt="edit" className="size-4 object-contain" />}
          </button>

          {isEditing && (
            <button
              onClick={handleSave}
              className="px-4 py-2 font-semibold bg-green-600 text-white rounded"
            >
              Save
            </button>
          )}
        </div>

        {/* Form Pages */}
        {currentPage === 1 && (
          <div className="space-y-3">
            <InputField label="Full Name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} disabled={!isEditing} />
            <InputField label="First Name" value={form.firstName ?? ""} onChange={(e) => handleChange("firstName", e.target.value)} disabled={!isEditing} />
            <InputField label="Last Name" value={form.lastName ?? ""} onChange={(e) => handleChange("lastName", e.target.value)} disabled={!isEditing} />
          </div>
        )}

        {currentPage === 2 && (
          <div className="space-y-3">
            <InputField label="Email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} disabled={!isEditing} />
            <InputField label="Role" value={form.role ?? ""} onChange={() => {}} disabled={true} />
            <InputField label="Status" value={form.isActive ? "Active" : "Inactive"} onChange={() => {}} disabled={true} />
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminProfile;