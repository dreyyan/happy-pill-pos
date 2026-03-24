// [IMPORT] Hooks
import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";

// [IMPORT] Components
import PrimaryButton from "../../components/PrimaryButton";
import CrudModal from "../../components/CrudModal";
import React from "react";

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
  const [error, setError] = useState<string | null>(null);

  // [STATE] Category Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const initialCategoryForm: CategoryForm = { name: "", description: "" };
  const [categoryForm, setCategoryForm] = useState(initialCategoryForm);

  // [STATE] Subcategory Modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);
  const [subError, setSubError] = useState("");

  const initialSubForm: SubcategoryForm = { name: "", categoryId: undefined };
  const [subForm, setSubForm] = useState(initialSubForm);

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

        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          setLoading(false);
          return;
        }

        const data = await res.json();

        if (!data.success) {
          setError(data.message || "Failed to fetch categories");
          setCategories([]);
          return;
        }

        setCategories(data.data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Something went wrong");
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [setShowTokenExpiredModal]);

  // *[HANDLE] Create Category
  const handleCreateCategory = async () => {
    setCategoryError("");

    if (!categoryForm.name) {
      setCategoryError("Category name is required");
      return;
    }

    try {
      setCreatingCategory(true);

      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(categoryForm),
        }
      );

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();

      if (!data.success) {
        setCategoryError(data.message || "Failed to create category");
        return;
      }

      setCategories((prev) => [...prev, data.data]);

      setShowCategoryModal(false);
      setCategoryForm(initialCategoryForm);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      setCategoryError(error.message);
    } finally {
      setCreatingCategory(false);
    }
  };

  // *[HANDLE] Delete Category
  const handleDeleteCategory = async (categoryId: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/categories/${categoryId}/hard`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Failed to delete category");
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      alert(error.message);
    }
  };

// *[HANDLE] Create Subcategory
const handleCreateSub = async () => {
  setSubError("");

  // LOG the current form state
  console.log("Submitting subForm:", subForm);

  if (!subForm.name || !subForm.categoryId) {
    console.log("Validation failed:", { name: subForm.name, categoryId: subForm.categoryId });
    setSubError("Subcategory name and category are required");
    return;
  }

  try {
    setCreatingSub(true);

    const token = localStorage.getItem("token");

    const bodyToSend = {
      ...subForm,
      categoryId: subForm.categoryId, // ensure it's a number
    };
    console.log("Sending to API:", bodyToSend);

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/subcategories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(bodyToSend),
    });

    if (res.status === 401) {
      setShowTokenExpiredModal(true);
      return;
    }

    const data = await res.json();

    console.log("API Response:", data);

    if (!data.success) {
      setSubError(data.message || "Failed to create subcategory");
      return;
    }

    // Add to correct category
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
    const error = err instanceof Error ? err : new Error("Something went wrong");
    setSubError(error.message);
  } finally {
    setCreatingSub(false);
  }
};

  // [LOADING / ERROR STATE]
  if (loading) return <p>Loading categories...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4">

      {/* ================= CATEGORY MODAL ================= */}
      <CrudModal<CategoryForm>
        isOpen={showCategoryModal}
        title="Create Category"
        onClose={() => setShowCategoryModal(false)}
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

      {/* ================= SUBCATEGORY MODAL ================= */}
<CrudModal<SubcategoryForm>
  isOpen={showSubModal}
  title="Create Subcategory"
  onClose={() => setShowSubModal(false)}
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
      options: categories.map((c) => ({ label: c.name, value: c.id })), // correct
      value: subForm.categoryId ?? "", // use the id directly
      onChange: (value) => {
        const valNum = Number(value); // convert string to number
        setSubForm((prev) => ({
          ...prev,
          categoryId: valNum, // ensure number
        }));
      },
    },
  ]}
/>

      {/* ================= HEADER ================= */}
      <div className="flex flex-col items-center">
        <h1 className="font-h2 font-font-extrabold text-text-900">
          Category Management
        </h1>
      </div>

      {/* ================= ACTION BUTTONS ================= */}
      <div className="flex flex-col gap-2">
        <PrimaryButton
          text="Add Category"
          iconSrc="/add-icon.svg"
          onClick={() => setShowCategoryModal(true)}
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

      {/* ================= CATEGORY LIST ================= */}
      <div className="space-y-4 mt-4 px-4 py-4 bg-bg-50 rounded-md">
        <h3 className="text-text-700">
          Categories
        </h3>
        {categories.length === 0 && (
          <p className="text-center text-gray-500">No categories found</p>
        )}

        {categories.map((category, idx) => {
          const bgColor = colorPalette[idx % colorPalette.length];

          return (
            <div
              key={category.id}
              className={`relative rounded-md p-4 shadow-sm ${bgColor} text-white`}
            >
              {/* Delete Button */}
              <button
                className="text-h6 absolute top-3 right-3 text-white font-bold px-2 py-1 rounded hover:bg-red-600 bg-red-500"
                onClick={() => handleDeleteCategory(category.id)}
              >
                ✕
              </button>

              <h2 className="font-bold text-lg">{category.name}</h2>
              <h5>{category.description}</h5>

              <div className="mt-2 pl-4 space-y-1">
                {(category.subcategories ?? []).length === 0 ? (
                  <p className="text-sm text-white/80">No subcategories</p>
                ) : (
                  category.subcategories.map((sub) => (
                    <p key={sub.id} className="text-sm">
                      • {sub.name}
                    </p>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCategories;