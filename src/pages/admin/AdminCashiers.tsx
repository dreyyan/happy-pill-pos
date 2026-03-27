// [IMPORT] Hooks
import React from "react";
import { useAuth } from "../../context/useAuth";
import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";

// [IMPORT] Components
import Modal from "../../components/Modal";
import CrudModal from "../../components/CrudModal";
import PrimaryButton from "../../components/PrimaryButton";

//  ? [INTERFACES]
interface CashierUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CashierData {
  id: number;
  userId: number;
  user: CashierUser;
}

interface CashierForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

type SortOption = "name-asc" | "name-desc" | "email-asc" | "email-desc";
const sortLabels: Record<SortOption, string> = {
  "name-asc": "Name ↑",
  "name-desc": "Name ↓",
  "email-asc": "Email ↑",
  "email-desc": "Email ↓",
};


const AdminCashiers = () => {
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Cashiers: Admin | Happy-Pill Cafe");

  // [STATES]
  const [cashiers, setCashiers] = useState<CashierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [STATE] Filter
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // [STATE] Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // [STATE] Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<CashierData | null>(null);

  // [STATE] Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cashierToDelete, setCashierToDelete] = useState<CashierData | null>(null);

  // [STATE] Form
  const initialForm: CashierForm = { firstName: "", lastName: "", email: "", password: "" };
  const [formData, setFormData] = useState<CashierForm>(initialForm);

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const token = () => localStorage.getItem("token");

  // ── Data ───────────────────────────────────────────────────────────────────

  // *[EFFECT] Fetch all cashiers
  useEffect(() => {
    const fetchCashiers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}/api/cashier/`, {
          headers: { Authorization: `Bearer ${token()}` },
        });

        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!data.success) {
          setError(data.message || "Failed to fetch cashiers");
          setCashiers([]);
          return;
        }

        setCashiers(data.data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Something went wrong");
        setError(error.message);
        setCashiers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCashiers();
  }, [setShowTokenExpiredModal]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  // *[HANDLE] Create cashier
  const handleCreateCashier = async () => {
    setFormError("");

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError("First name, last name, and email are required.");
      return;
    }
    if (!formData.password) {
      setFormError("Password is required for new cashiers.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch(`${apiBase}/api/cashier/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.status === 401) { setShowTokenExpiredModal(true); return; }

      const data = await res.json();
      if (!data.success) { setFormError(data.message || "Failed to create cashier"); return; }

      setCashiers((prev) => [...prev, data.data]);
      setShowCreateModal(false);
      setFormData(initialForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  // *[HANDLE] Edit cashier
  const handleEditCashier = async () => {
    if (!selectedCashier) return;
    setFormError("");

    if (!formData.firstName || !formData.lastName || !formData.email) {
      setFormError("First name, last name, and email are required.");
      return;
    }

    try {
      setCreating(true);
      const { password, ...payload } = formData; // omit password on edit
      const res = await fetch(`${apiBase}/api/cashier/${selectedCashier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) { setShowTokenExpiredModal(true); return; }

      const data = await res.json();
      if (!data.success) { setFormError(data.message || "Failed to update cashier"); return; }

      setCashiers((prev) => prev.map((c) => (c.id === selectedCashier.id ? data.data : c)));
      setShowEditModal(false);
      setSelectedCashier(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  // *[HANDLE] Delete cashier
  const handleConfirmDelete = async () => {
    if (!cashierToDelete) return;
    try {
      const res = await fetch(`${apiBase}/api/cashiers/${cashierToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      if (res.status === 401) { setShowTokenExpiredModal(true); return; }

      const data = await res.json();
      if (!data.success) { alert(data.message || "Failed to delete cashier"); return; }

      setCashiers((prev) => prev.filter((c) => c.id !== cashierToDelete.id));
      setShowDeleteModal(false);
      setCashierToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ── Filter + Sort ──────────────────────────────────────────────────────────

  const displayedCashiers = cashiers
    .filter((c) => {
      const q = search.toLowerCase();
      return `${c.user.firstName} ${c.user.lastName} ${c.user.email}`.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return a.user.firstName.localeCompare(b.user.firstName);
        case "name-desc": return b.user.firstName.localeCompare(a.user.firstName);
        case "email-asc": return a.user.email.localeCompare(b.user.email);
        case "email-desc": return b.user.email.localeCompare(a.user.email);
      }
    });

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <p>Loading cashiers...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4 relative">

      {/* [MODAL] Confirm Delete */}
      {showDeleteModal && cashierToDelete && (
        <Modal
          isOpen={showDeleteModal}
          title="Delete Cashier"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          confirmText="Delete"
          cancelText="Cancel"
        >
          <p>
            Are you sure you want to delete{" "}
            <strong>{cashierToDelete.user.firstName} {cashierToDelete.user.lastName}</strong>?
          </p>
        </Modal>
      )}

      {/* [MODAL] Create Cashier */}
      <CrudModal<CashierForm>
        isOpen={showCreateModal}
        title="Create Cashier"
        onClose={() => { setShowCreateModal(false); setFormError(""); }}
        onConfirm={handleCreateCashier}
        loading={creating}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          { key: "firstName", label: "First Name", type: "text" },
          { key: "lastName", label: "Last Name", type: "text" },
          { key: "email", label: "Email", type: "text" },
          { key: "password", label: "Password", type: "text" },
        ]}
      />

      {/* [MODAL] Edit Cashier */}
      <CrudModal<CashierForm>
        isOpen={showEditModal}
        title="Edit Cashier"
        onClose={() => { setShowEditModal(false); setFormError(""); setSelectedCashier(null); }}
        onConfirm={handleEditCashier}
        loading={creating}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          { key: "firstName", label: "First Name", type: "text" },
          { key: "lastName", label: "Last Name", type: "text" },
          { key: "email", label: "Email", type: "text" },
        ]}
      />

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Cashier Management</h1>
      </div>

      {/* [SECTION] Search & Sort */}
      <div className="flex items-center gap-4 mt-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 pl-4 pr-3 outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />
        </div>

        <div ref={filterRef} className="relative">
          <button
            onClick={() => setShowSortFilters(!showSortFilters)}
            className={`flex items-center justify-center text-[var(--color-text-50)] rounded-sm p-2 border transition cursor-pointer ${
              showSortFilters
                ? "bg-[var(--color-primary-600)] border-[var(--color-primary-500)]"
                : "bg-[var(--color-primary-700)] border-[var(--color-primary-700)] hover:opacity-80"
            }`}
          >
            <img src="/filter-icon.svg" alt="Sort" className="w-5 h-5" />
          </button>

          {showSortFilters && (
            <div className="absolute right-0 mt-2 w-40 bg-[var(--color-bg-50)] border border-[var(--color-bg-300)] rounded-md shadow-lg p-2 space-y-1 z-50">
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => { setSortOption(option); setShowSortFilters(false); }}
                  className={`w-full text-left px-2 py-1 font-roboto text-sm rounded hover:bg-[var(--color-bg-200)] ${
                    sortOption === option ? "bg-[var(--color-primary-200)]" : ""
                  }`}
                >
                  {sortLabels[option]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PrimaryButton
        text="Add New Cashier"
        iconSrc="/add-icon.svg"
        onClick={() => {
          setFormData(initialForm);
          setShowCreateModal(true);
        }}
      />

      {/* [SECTION] Cashiers Table */}
      <div className="overflow-x-auto mt-4 rounded-lg">
        {displayedCashiers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center text-[var(--color-text-800)]">
            <img src="/no-data-icon.svg" alt="No cashiers" className="size-16" />
            <p className="font-roboto font-semibold text-lg">No cashiers found</p>
            <p className="font-roboto text-sm text-[var(--color-text-700)]">
              Try searching for a different name or email.
            </p>
          </div>
        )}

        {displayedCashiers.length > 0 && (
          <table className="min-w-full bg-white shadow-md table-auto border-collapse">
            <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
              <tr>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-10">#</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-48 truncate">Name</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-56 truncate hidden sm:table-cell">Email</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-24 hidden sm:table-cell">Status</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28 hidden sm:table-cell">Created</th>
                <th className="py-2 px-4 text-left font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="font-roboto">
              {displayedCashiers.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)] transition-colors duration-200 ease-in-out"
                >
                  <td className="text-sm py-2 px-4 text-[var(--color-text-500)] border-r border-[var(--color-bg-300)] font-mono">
                    #{c.id}
                  </td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] font-semibold">
                    {c.user.firstName} {c.user.lastName}
                  </td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-600)] border-r border-[var(--color-bg-300)] hidden sm:table-cell">
                    {c.user.email}
                  </td>
                  <td className="text-sm py-2 px-4 border-r border-[var(--color-bg-300)] hidden sm:table-cell">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      c.user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.user.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                      {c.user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-500)] border-r border-[var(--color-bg-300)] hidden sm:table-cell whitespace-nowrap">
                    {new Date(c.user.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="py-2 px-4 flex justify-center items-center gap-2">
                    <img
                      src="/edit-filled-icon.svg"
                      alt="Edit"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        setSelectedCashier(c);
                        setFormData({
                          firstName: c.user.firstName,
                          lastName: c.user.lastName,
                          email: c.user.email,
                          password: "",
                        });
                        setShowEditModal(true);
                      }}
                    />
                    <img
                      src="/delete-icon.svg"
                      alt="Delete"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        setCashierToDelete(c);
                        setShowDeleteModal(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminCashiers;