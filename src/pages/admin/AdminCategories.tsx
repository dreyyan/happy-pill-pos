// [IMPORT] Hooks
import React from "react";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";

// [IMPORT] Components
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";
import CrudModal from "../../components/CrudModal";
import PrimaryButton from "../../components/PrimaryButton";

// ? [INTERFACES]
interface Subcategory {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
  subcategories: Subcategory[];
}

interface CategoryForm {
  name: string;
  description: string;
}

interface SubcategoryForm {
  name: string;
  categoryId?: number;
}

interface EditSubcategoryForm {
  name: string;
}

// ?[CONSTANTS]
const colorPalette = [
  "bg-primary-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-secondary-500",
];

const AdminCategories = () => {
  const { setShowTokenExpiredModal } = useAuth();

  // [STATES]
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string | null>(null);

  // [STATE] Create Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const initialCategoryForm: CategoryForm = { name: "", description: "" };
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);

  // [STATE] Edit Category Modal
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [editCategoryError, setEditCategoryError] = useState("");
  const [editCategoryForm, setEditCategoryForm] = useState<CategoryForm>({ name: "", description: "" });

  // [STATE] Create Subcategory Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);
  const [subError, setSubError] = useState("");
  const initialSubForm: SubcategoryForm = { name: "", categoryId: undefined };
  const [subForm, setSubForm] = useState(initialSubForm);

  // [STATE] Edit Subcategory Modal
  const [showEditSubModal, setShowEditSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null);
  const [updatingSub, setUpdatingSub] = useState(false);
  const [editSubError, setEditSubError] = useState("");
  const [editSubForm, setEditSubForm] = useState<EditSubcategoryForm>({ name: "" });

  // [STATE] Delete Category Modal
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // [STATE] Delete Subcategory Modal
  const [showDeleteSubModal, setShowDeleteSubModal] = useState(false);
  const [subToDelete, setSubToDelete] = useState<{ sub: Subcategory; categoryId: number } | null>(null);

  // [STATE] CSV Profile
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // [STATES] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  // [STATES] Config
  const [businessName, setBusinessName] = useState("POS System");

  // * [EFFECT] Fetch config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/config/first-time`);
        const data = await res.json();

        // If response is not OK or missing data → do nothing
        if (!res.ok || !data.success || !data.data) return;

        const { exists, businessName: fetchedName } = data.data;

        // If config does not exist → do nothing
        if (!exists) return;

        // Set business name, fallback to default
        setBusinessName(fetchedName || "POS System");

      } catch (err) {
        console.error("Error fetching admin config:", err);
      }
    };

    fetchConfig();
  }, []); // no need for navigate here, unless you redirect inside

  // * [UPDATE PAGE TITLE]
  usePageTitle(`Categories: Admin | ${businessName}`);

  // * [EFFECT] Reset loading
  useEffect(() => setLoading(false), []);

  // [HANDLE] CSV selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // * [HANDLE] Upload CSV and Auto-Create Categories & Subcategories
  const handleUploadCsv = async () => {
    if (!csvFile) {
      setModalTitle("Validation Error");
      setModalMessage("Please select a CSV file to upload.");
      setModalType("error");
      setShowModal(true);
      return;
    }

    const token = localStorage.getItem("token");
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categories/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();

      if (!data.success) {
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "") || "Failed to upload CSV";
        throw new Error(cleanMessage);
      }

      // * [SUCCESS] CSV uploaded
      setModalTitle("Success");
      setModalMessage(`Successfully imported ${data.data.createdCategories} categories and ${data.data.createdSubcategories} subcategories from CSV!`);
      setModalType("success");
      setShowModal(true);

      // Refresh categories list after import
      const fetchCategories = async () => {
        setLoading(true);
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const result = await res.json();
          if (result.success) setCategories(result.data);
        } catch (err) {
          console.error("Failed to refresh categories after CSV import", err);
        } finally {
          setLoading(false);
        }
      };
      fetchCategories();

      // Reset file input
      setCsvFile(null);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
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

  // *[EFFECT] Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/categories`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) { setShowTokenExpiredModal(true); setLoading(false); return; }
        const data = await res.json();
        if (!data.success) { setError(data.message || "Failed to fetch categories"); setCategories([]); return; }
        setCategories(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [setShowTokenExpiredModal]);

  // *[HANDLE] Create Category
  const handleCreateCategory = async () => {
    setCategoryError("");
    if (!categoryForm.name) { setCategoryError("Category name is required"); return; }
    try {
      setCreatingCategory(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(categoryForm),
      });
      if (res.status === 401) { setShowTokenExpiredModal(true); return; }
      const data = await res.json();
      if (!data.success) { setCategoryError(data.message || "Failed to create category"); return; }
      setCategories((prev) => [...prev, data.data]);
      setShowCategoryModal(false);
      setCategoryForm(initialCategoryForm);
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreatingCategory(false);
    }
  };

  // *[HANDLE] Update Category
  const handleUpdateCategory = async () => {
    setEditCategoryError("");
    if (!editCategoryForm.name) { setEditCategoryError("Category name is required"); return; }
    if (!editingCategory) return;
    try {
      setUpdatingCategory(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editCategoryForm),
      });
      if (res.status === 401) { setShowTokenExpiredModal(true); return; }
      const data = await res.json();
      if (!data.success) { setEditCategoryError(data.message || "Failed to update category"); return; }
      setCategories((prev) =>
        prev.map((c) => c.id === editingCategory.id ? { ...c, ...editCategoryForm } : c)
      );
      setShowEditCategoryModal(false);
      setEditingCategory(null);
    } catch (err) {
      setEditCategoryError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingCategory(false);
    }
  };

  // *[HANDLE] Delete Category
  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryToDelete.id}/hard`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!data.success) { alert(data.message || "Failed to delete category"); return; }
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      setShowDeleteCategoryModal(false);
      setCategoryToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // *[HANDLE] Create Subcategory
  const handleCreateSub = async () => {
    setSubError("");
    if (!subForm.name || !subForm.categoryId) { setSubError("Subcategory name and category are required"); return; }
    try {
      setCreatingSub(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/subcategories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(subForm),
      });
      if (res.status === 401) { setShowTokenExpiredModal(true); return; }
      const data = await res.json();
      if (!data.success) { setSubError(data.message || "Failed to create subcategory"); return; }
      setCategories((prev) =>
        prev.map((c) =>
          c.id === subForm.categoryId
            ? { ...c, subcategories: [...(c.subcategories || []), data.data] }
            : c
        )
      );
      setShowSubModal(false);
      setSubForm(initialSubForm);
    } catch (err) {
      setSubError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreatingSub(false);
    }
  };

  // *[HANDLE] Update Subcategory
  const handleUpdateSub = async () => {
    setEditSubError("");
    if (!editSubForm.name) { setEditSubError("Subcategory name is required"); return; }
    if (!editingSub) return;
    try {
      setUpdatingSub(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/subcategories/${editingSub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editSubForm),
      });
      if (res.status === 401) { setShowTokenExpiredModal(true); return; }
      const data = await res.json();
      if (!data.success) { setEditSubError(data.message || "Failed to update subcategory"); return; }
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          subcategories: c.subcategories.map((s) =>
            s.id === editingSub.id ? { ...s, name: editSubForm.name } : s
          ),
        }))
      );
      setShowEditSubModal(false);
      setEditingSub(null);
    } catch (err) {
      setEditSubError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingSub(false);
    }
  };

  // *[HANDLE] Delete Subcategory
  const handleConfirmDeleteSub = async () => {
    if (!subToDelete) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/subcategories/${subToDelete.sub.id}/hard`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!data.success) { alert(data.message || "Failed to delete subcategory"); return; }
      setCategories((prev) =>
        prev.map((c) =>
          c.id === subToDelete.categoryId
            ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subToDelete.sub.id) }
            : c
        )
      );
      setShowDeleteSubModal(false);
      setSubToDelete(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-10 px-4 space-y-4">
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
      {/* [CRUD MODAL] Delete Category */}
      {showDeleteCategoryModal && categoryToDelete && (
        <Modal
          isOpen={showDeleteCategoryModal}
          title="Delete Category"
          onClose={() => { setShowDeleteCategoryModal(false); setCategoryToDelete(null); }}
          onConfirm={handleConfirmDeleteCategory}
          confirmText="Delete"
          cancelText="Cancel"
        >
          <p>
            Are you sure you want to delete <strong>{categoryToDelete.name}</strong>?
            This will also remove all its subcategories.
          </p>
        </Modal>
      )}
      {/* [CRUD MODAL] Delete Subcategory */}
      {showDeleteSubModal && subToDelete && (
        <Modal
          isOpen={showDeleteSubModal}
          title="Delete Subcategory"
          onClose={() => { setShowDeleteSubModal(false); setSubToDelete(null); }}
          onConfirm={handleConfirmDeleteSub}
          confirmText="Delete"
          cancelText="Cancel"
        >
          <p>
            Are you sure you want to delete subcategory <strong>{subToDelete.sub.name}</strong>?
          </p>
        </Modal>
      )}

      {/* [CRUD MODAL] Create Category */}
      <CrudModal<CategoryForm>
        isOpen={showCategoryModal}
        title="Create Category"
        onClose={() => { setShowCategoryModal(false); setCategoryError(""); }}
        onConfirm={handleCreateCategory}
        loading={creatingCategory}
        showForm
        formData={categoryForm}
        setFormData={setCategoryForm}
        formError={categoryError}
        formFields={[
          { key: "name", label: "Category Name", type: "text" },
          { key: "description", label: "Description (Optional)", type: "text" },
        ]}
      />

      {/* [CRUD MODAL] Edit Category */}
      <CrudModal<CategoryForm>
        isOpen={showEditCategoryModal}
        title="Edit Category"
        onClose={() => { setShowEditCategoryModal(false); setEditCategoryError(""); setEditingCategory(null); }}
        onConfirm={handleUpdateCategory}
        loading={updatingCategory}
        showForm
        formData={editCategoryForm}
        setFormData={setEditCategoryForm}
        formError={editCategoryError}
        formFields={[
          { key: "name", label: "Category Name", type: "text" },
          { key: "description", label: "Description (Optional)", type: "text" },
        ]}
      />

      {/* [CRUD MODAL] Create Subcategory */}
      <CrudModal<SubcategoryForm>
        isOpen={showSubModal}
        title="Create Subcategory"
        onClose={() => { setShowSubModal(false); setSubError(""); }}
        onConfirm={handleCreateSub}
        loading={creatingSub}
        showForm
        formData={subForm}
        setFormData={setSubForm}
        formError={subError}
        formFields={[
          { key: "name", label: "Subcategory Name", type: "text" },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            options: categories.map((c) => ({ label: c.name, value: c.id })),
            value: subForm.categoryId ?? "",
            onChange: (value) => {
              setSubForm((prev) => ({ ...prev, categoryId: Number(value) }));
            },
          },
        ]}
      />

      {/* [CRUD MODAL] Edit Subcategory */}
      <CrudModal<EditSubcategoryForm>
        isOpen={showEditSubModal}
        title="Edit Subcategory"
        onClose={() => { setShowEditSubModal(false); setEditSubError(""); setEditingSub(null); }}
        onConfirm={handleUpdateSub}
        loading={updatingSub}
        showForm
        formData={editSubForm}
        setFormData={setEditSubForm}
        formError={editSubError}
        formFields={[
          { key: "name", label: "Subcategory Name", type: "text" },
        ]}
      />

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center">
        {/* [UI] Page Title */}
        <h1 className="font-bold text-2xl">Category Management</h1>
      </div>

      {/* [SECTION] Action Buttons */}
      <div className="flex flex-col gap-2">
        <PrimaryButton
          text="Add Category"
          iconSrc="/add-icon.svg"
          onClick={() => {
            setCategoryForm(initialCategoryForm);
            setShowCategoryModal(true);
          }}
        />
        <PrimaryButton
          text="Add Subcategory"
          iconSrc="/add-icon.svg"
          color="F59E0B"
          onClick={() => {
            setSubForm({ name: "", categoryId: categories[0]?.id });
            setShowSubModal(true);
          }}
        />
      </div>

      {/* [SECTION] Category List */}
      <div className="space-y-4 mt-4 px-4 py-4 bg-bg-50 rounded-md">
        <h3 className="text-text-700">Categories</h3>

        {categories.length === 0 && (
          <p className="text-center text-gray-500">No categories found</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* [SECTION] Categories Display */}
          {categories.map((category, idx) => {
            const bgColor = colorPalette[idx % colorPalette.length];
            return (
              <div
                key={category.id}
                className={`relative rounded-md p-4 shadow-sm ${bgColor} text-white`}
              >
                {/* [UI] Category Action Buttons */}
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {/* [BUTTON] Edit Category */}
                  <button
                    className="text-white font-bold p-2 h-full rounded hover:bg-white/20 transition-colors"
                    onClick={() => {
                      setEditingCategory(category);
                      setEditCategoryForm({ name: category.name, description: category.description ?? "" });
                      setEditCategoryError("");
                      setShowEditCategoryModal(true);
                    }}
                  >
                    <img src="/edit-filled-icon.svg" alt="Edit" className="w-4 h-4 brightness-0 invert" />
                  </button>

                  {/* [BUTTON] Delete Category */}
                  <button
                    className="text-white font-bold p-1 rounded hover:bg-red-600 bg-red-500 transition-colors"
                    onClick={() => {
                      setCategoryToDelete(category);
                      setShowDeleteCategoryModal(true);
                    }}
                  >
                    <img src="/close-icon.svg" alt="Close" className="size-5 brightness-0 invert" />
                  </button>
                </div>

                {/* [UI] Category Info */}
                <h2 className="font-bold text-lg pr-20">{category.name}</h2>
                {category.description && <p className="text-sm text-white/80">{category.description}</p>}

                {/* [UI] Subcategory List */}
                <div className="mt-3 pl-2 space-y-1">
                  {(category.subcategories ?? []).length === 0 ? (
                    <p className="text-sm text-white/80">No subcategories</p>
                  ) : (
                    category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-2 group">
                        <p className="text-sm">• {sub.name}</p>

                        {/* [UI] Subcategory Action Buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* [BUTTON] Edit Subcategory */}
                          <button
                            className="text-white p-1 rounded hover:bg-white/20 transition-colors"
                            onClick={() => {
                              setEditingSub(sub);
                              setEditSubForm({ name: sub.name });
                              setEditSubError("");
                              setShowEditSubModal(true);
                            }}
                          >
                            <img src="/edit-filled-icon.svg" alt="Edit" className="w-3.5 h-3.5 brightness-0 invert" />
                          </button>

                          {/* [BUTTON] Delete Subcategory */}
                          <button
                            className="text-white p-1 rounded hover:bg-red-600 bg-red-500/70 transition-colors text-xs font-bold"
                            onClick={() => {
                              setSubToDelete({ sub, categoryId: category.id });
                              setShowDeleteSubModal(true);
                            }}
                          >
                            <img src="/close-icon.svg" alt="Close" className="size-3 brightness-0 invert" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>


              </div>
            );
          })}
        </div>
      </div>
      {/* [SECTION] CSV Upload */}
      <div className="w-full max-w-md bg-bg-100 border border-bg-300 rounded-lg shadow-sm p-5 space-y-4">
        <h3 className="text-text-700 font-semibold">Auto-Create Categories (CSV)</h3>
        <p className="text-text-500 text-sm">
          Upload 'items-database.csv'.
        </p>

        {/* [INPUT] Upload CSV */}
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          onChange={handleCsvChange}
          className="w-full border border-bg-300 rounded-md p-2 text-sm"
        />

        {/* [PRIMARY BUTTON] Upload CSV */}
        <PrimaryButton text={`${uploading ? "Uploading..." : "Upload CSV & Create Categories"}`} onClick={handleUploadCsv} disabled={uploading} />
      </div>
    </div>
  );
};

export default AdminCategories;