// [IMPORT] Hooks
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

// [IMPORT] Components
import PrimaryButton from "../../components/PrimaryButton";
import CrudModal from "../../components/CrudModal";
import React from "react";
import Modal from "../../components/Modal";

// ? [INTERFACES]
interface Item {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  quantity: number;
  unit?: string;
  isActive: boolean;
  category?: { id: number; name: string };
  subcategory?: { id: number; name: string };
}

interface CreateItemForm {
  name: string;
  sku: string;
  price: number;
  cost?: number;
  quantity: number;
  categoryId?: number;
  subcategoryId?: number;
  unit?: string;
}

interface Subcategory {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
  subcategories: Subcategory[];
}

type SortOption = "name-asc" | "name-desc" | "sku-asc" | "sku-desc" | "price-asc" | "price-desc";
const sortLabels: Record<SortOption, string> = {
  "name-asc": "Name ↑",
  "name-desc": "Name ↓",
  "sku-asc": "SKU ↑",
  "sku-desc": "SKU ↓",
  "price-asc": "Price ↑",
  "price-desc": "Price ↓",
};

const AdminItems = () => {
  const navigate = useNavigate();
  const { setShowTokenExpiredModal } = useAuth();

  // [STATES]
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [STATE] Filter
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // [STATE] CRUD Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // [HANDLE] Open Delete Modal
  const confirmDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  // [HANDLE] Confirm Delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items/${itemToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete item");
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      alert(error.message);
    }
  };

  // [STATE] Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // ? Initial form data
  const initialForm: CreateItemForm = {
    name: "",
    sku: "",
    price: 0,
    cost: 0,
    quantity: 0,
    categoryId: undefined,
    subcategoryId: undefined,
    unit: "",
  };
  const [formData, setFormData] = useState(initialForm);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // ? [HELPER] Selected category object
  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  // *[EFFECT] Fetch categories when modal opens
  useEffect(() => {
    if (!showCreateModal && !showEditModal) return;

    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          return;
        }

        const data = await res.json();
        if (data.success) setCategories(data.data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };

    fetchCategories();
  }, [showCreateModal, showEditModal, setShowTokenExpiredModal]);

  // *[HANDLE] Create item
  const handleCreateItem = async () => {
    setFormError("");

    if (!formData.name || !formData.sku) {
      setFormError("Name and SKU are required");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        categoryId: formData.categoryId ?? null,
        subcategoryId: formData.subcategoryId ?? null,
        isActive: true,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || "Failed to create item");
        return;
      }

      setShowCreateModal(false);
      setFormData(initialForm);
      setItems((prev) => [...prev, data.data]);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      setFormError(error.message);
    } finally {
      setCreating(false);
    }
  };

  // *[HANDLE] Edit item
  const handleEditItem = async () => {
    if (!selectedItem) return;

    setFormError("");
    if (!formData.name || !formData.sku) {
      setFormError("Name and SKU are required");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        categoryId: formData.categoryId ?? null,
        subcategoryId: formData.subcategoryId ?? null,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || "Failed to update item");
        return;
      }

      // Update local items
      setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? data.data : i)));
      setShowEditModal(false);
      setSelectedItem(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      setFormError(error.message);
    } finally {
      setCreating(false);
    }
  };

  // *[HANDLE] Delete item
  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to delete item");
        return;
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Something went wrong");
      alert(error.message);
    }
  };

  // *[EFFECT] Fetch all items
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          setShowTokenExpiredModal(true);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!data || !data.success || !data.data) {
          setError(data?.message || "Failed to fetch items");
          setItems([]);
          setLoading(false);
          return;
        }

        setItems(data.data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Something went wrong");
        setError(error.message);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [setShowTokenExpiredModal]);

  // ?Filtered & sorted items
  const displayedItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "sku-asc": return a.sku.localeCompare(b.sku);
        case "sku-desc": return b.sku.localeCompare(a.sku);
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
      }
    });

  // [LOADING / ERROR STATE]
  if (loading) return <p>Loading items...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4 relative">
    {/* [MODAL] Confirm Delete */}
    {showDeleteModal && itemToDelete && (
      <Modal
        isOpen={showDeleteModal}
        title="Delete Item"
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      >
        <p>
          Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
        </p>
      </Modal>
    )}
      {/* [MODAL] Create Item */}
      <CrudModal<typeof initialForm>
        isOpen={showCreateModal}
        title="Create Item"
        onClose={() => {
          setShowCreateModal(false);
          setFormError("");
        }}
        onConfirm={handleCreateItem}
        loading={creating}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          { key: "name", label: "Item Name", type: "text" },
          { key: "sku", label: "SKU", type: "text" },
          { key: "price", label: "Selling Price", type: "number" },
          { key: "cost", label: "Cost", type: "number" },
          { key: "quantity", label: "Quantity", type: "number" },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            options: categories.map((c) => ({ label: c.name, value: c.id })),
            value: formData.categoryId ? String(formData.categoryId) : "",
            onChange: (value) => {
              const id = Number(value);
              const category = categories.find((c) => c.id === id);
              setFormData((prev) => ({
                ...prev,
                categoryId: id,
                subcategoryId: category?.subcategories[0]?.id ?? undefined,
              }));
            },
          },
          {
            key: "subcategoryId",
            label: "Subcategory",
            type: "select",
            options: selectedCategory?.subcategories.map((s) => ({ label: s.name, value: s.id })) ?? [],
            value: formData.subcategoryId ? String(formData.subcategoryId) : "",
            onChange: (value) => {
              setFormData((prev) => ({
                ...prev,
                subcategoryId: Number(value),
              }));
            },
          },
          { key: "unit", label: "Unit", type: "text" },
        ]}
      />

      {/* [MODAL] Edit Item */}
      <CrudModal<typeof initialForm>
        isOpen={showEditModal}
        title="Edit Item"
        onClose={() => {
          setShowEditModal(false);
          setFormError("");
          setSelectedItem(null);
        }}
        onConfirm={handleEditItem}
        loading={creating}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          { key: "name", label: "Item Name", type: "text" },
          { key: "sku", label: "SKU", type: "text" },
          { key: "price", label: "Selling Price", type: "number" },
          { key: "cost", label: "Cost", type: "number" },
          { key: "quantity", label: "Quantity", type: "number" },
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            options: categories.map((c) => ({ label: c.name, value: c.id })),
            value: formData.categoryId ? String(formData.categoryId) : "",
            onChange: (value) => {
              const id = Number(value);
              const category = categories.find((c) => c.id === id);
              setFormData((prev) => ({
                ...prev,
                categoryId: id,
                subcategoryId: category?.subcategories[0]?.id ?? undefined,
              }));
            },
          },
          {
            key: "subcategoryId",
            label: "Subcategory",
            type: "select",
            options: selectedCategory?.subcategories.map((s) => ({ label: s.name, value: s.id })) ?? [],
            value: formData.subcategoryId ? String(formData.subcategoryId) : "",
            onChange: (value) => {
              setFormData((prev) => ({
                ...prev,
                subcategoryId: Number(value),
              }));
            },
          },
          { key: "unit", label: "Unit", type: "text" },
        ]}
      />

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Item Management</h1>
      </div>

      {/* [SECTION] Search & Sort */}
      <div className="flex items-center gap-4 mt-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Name, SKU, or Barcode..."
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
              {["name-asc","name-desc","sku-asc","sku-desc","price-asc","price-desc"].map((option) => (
                <button
                  key={option}
                  onClick={() => { setSortOption(option as SortOption); setShowSortFilters(false); }}
                  className={`w-full text-left px-2 py-1 font-roboto text-sm rounded hover:bg-[var(--color-bg-200)] ${
                    sortOption === option ? "bg-[var(--color-primary-200)]" : ""
                  }`}
                >
                  {sortLabels[option as SortOption]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <PrimaryButton
        text="Add New Item"
        iconSrc="/add-icon.svg"
        onClick={() => {
          setFormData({ ...initialForm, categoryId: categories[0]?.id });
          setShowCreateModal(true);
        }}
      />

      {/* [SECTION] Items Table */}
      <div className="overflow-x-auto mt-4 rounded-lg">
        {displayedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center text-[var(--color-text-800)]">
            <img src="/no-data-icon.svg" alt="No items" className="size-16" />
            <p className="font-roboto font-semibold text-lg">No items found</p>
            <p className="font-roboto text-sm text-[var(--color-text-700)]">
              Try searching for a different name, SKU, or barcode.
            </p>
          </div>
        )}

        {displayedItems.length > 0 && (
          <table className="min-w-full bg-white shadow-md table-auto border-collapse">
            <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
              <tr>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-36 truncate hidden sm:table-cell">SKU</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-56 truncate">Name</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28 hidden sm:table-cell">Selling Price</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28">Quantity</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28 hidden sm:table-cell">Category</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28 hidden sm:table-cell">Subcategory</th>
                <th className="py-2 px-4 text-left font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="font-roboto">
              {displayedItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)] cursor-pointer transition-colors duration-200 ease-in-out"
                >
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] truncate hidden sm:table-cell">{item.sku}</td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] truncate">{item.name}</td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] hidden sm:table-cell">{item.price.toFixed(2)}</td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)]">{item.quantity}</td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] hidden sm:table-cell">{item.category?.name ?? "-"}</td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] hidden sm:table-cell">{item.subcategory?.name ?? "-"}</td>
                  <td className="py-2 px-4 flex justify-center items-center gap-2">
                    <img
                      src="/edit-filled-icon.svg"
                      alt="Edit"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setFormData({
                          name: item.name,
                          sku: item.sku,
                          price: item.price,
                          cost: item.cost,
                          quantity: item.quantity,
                          categoryId: item.category?.id,
                          subcategoryId: item.subcategory?.id,
                          unit: item.unit,
                        });
                        setShowEditModal(true);
                      }}
                    />
                    <img
                      src="/delete-icon.svg"
                      alt="Delete"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => confirmDelete(item)}
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

export default AdminItems;