// [IMPORT] Hooks
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/useAuth";

// [IMPORT] Components
import PrimaryButton from "../../components/PrimaryButton";
import CrudModal from "../../components/CrudModal";
import Modal from "../../components/Modal";

const AdminItems = () => {
  const { setShowTokenExpiredModal } = useAuth();

  // [STATES] Items & Loading
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // [STATE] Filter & Sorting
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // [STATE] Category & Subcategory Filters
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<number | null>(null);

  // [STATE] CRUD Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  // [STATE] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  // [STATE] Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // [STATE] Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initial form (no quantity)
  const initialForm: CreateItemForm = {
    name: "",
    sku: "",
    price: 0,
    cost: 0,
    categoryId: undefined,
    subcategoryId: undefined,
    unit: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const selectedCategory = categories.find((c) => c.id === formData.categoryId);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  const confirmDelete = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

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
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

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

      setItems((prev) => [...prev, data.data]);
      setShowCreateModal(false);
      setFormData(initialForm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  // Fetch categories
  useEffect(() => {
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
  }, [setShowTokenExpiredModal]);

  // Fetch items
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
        if (!data?.success) {
          setError(data?.message || "Failed to fetch items");
          setItems([]);
          return;
        }
        setItems(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, [setShowTokenExpiredModal]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowSortFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered & Sorted items
  const displayedItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => (filterCategoryId ? item.category?.id === filterCategoryId : true))
    .filter((item) => (filterSubcategoryId ? item.subcategory?.id === filterSubcategoryId : true))
    .sort((a, b) => {
      switch (sortOption) {
        case "name-asc": return a.name.localeCompare(b.name);
        case "name-desc": return b.name.localeCompare(a.name);
        case "sku-asc": return a.sku.localeCompare(b.sku);
        case "sku-desc": return b.sku.localeCompare(a.sku);
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
      }
      return 0;
    });

  const handleAutoAddClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataObj = new FormData();
    formDataObj.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items/import-items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataObj,
      });

      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }

      const data = await res.json();
      if (!data.success) {
        setModalTitle("Import Failed");
        setModalMessage(data.message || "Failed to import CSV");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setModalTitle("Import Success");
      setModalMessage(`Successfully imported ${data.data.createdCount} items.`);
      setModalType("success");
      setShowModal(true);

      // Refresh list
      const resRefresh = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const refreshData = await resRefresh.json();
      if (refreshData.success) setItems(refreshData.data);
    } catch (err) {
      setModalTitle("Error");
      setModalMessage(err instanceof Error ? err.message : "Something went wrong");
      setModalType("error");
      setShowModal(true);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <p>Loading items...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4 relative">
      {/* Delete Confirmation */}
      {showDeleteModal && itemToDelete && (
        <Modal
          isOpen={showDeleteModal}
          title="Delete Item"
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          confirmText="Delete"
          cancelText="Cancel"
        >
          <p>Are you sure you want to delete <strong>{itemToDelete.name}</strong>?</p>
        </Modal>
      )}

      {/* Success/Error Modal */}
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

      {/* Create Item Modal */}
      <CrudModal<typeof initialForm>
        isOpen={showCreateModal}
        title="Create New Item"
        onClose={() => {
          setShowCreateModal(false);
          setFormError("");
          setFormData(initialForm);
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
          {
            key: "categoryId",
            label: "Category",
            type: "select",
            options: categories.map((c) => ({ label: c.name, value: c.id })),
            value: formData.categoryId ? String(formData.categoryId) : "",
            onChange: (value) => {
              const id = Number(value);
              const cat = categories.find((c) => c.id === id);
              setFormData((prev) => ({
                ...prev,
                categoryId: id,
                subcategoryId: cat?.subcategories[0]?.id ?? undefined,
              }));
            },
          },
          {
            key: "subcategoryId",
            label: "Subcategory",
            type: "select",
            options: selectedCategory?.subcategories.map((s) => ({ label: s.name, value: s.id })) ?? [],
            value: formData.subcategoryId ? String(formData.subcategoryId) : "",
            onChange: (value) => setFormData((prev) => ({ ...prev, subcategoryId: Number(value) })),
          },
          { key: "unit", label: "Unit", type: "text" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Item Management</h1>
      </div>

      {/* Search & Sort */}
      <div className="flex items-center gap-4 mt-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by Name or SKU..."
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
              {Object.keys(sortLabels).map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSortOption(option as SortOption);
                    setShowSortFilters(false);
                  }}
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

      {/* Category Filters */}
      <div className="flex gap-2 mt-4">
        <select
          className="flex-1 bg-[var(--color-bg-50)] rounded-sm py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary-600)]"
          value={filterCategoryId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value) || null;
            setFilterCategoryId(id);
            setFilterSubcategoryId(null);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          className="flex-1 bg-[var(--color-bg-50)] rounded-sm py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary-600)]"
          value={filterSubcategoryId ?? ""}
          onChange={(e) => setFilterSubcategoryId(Number(e.target.value) || null)}
          disabled={!filterCategoryId}
        >
          <option value="">All Subcategories</option>
          {filterCategoryId &&
            categories
              .find((c) => c.id === filterCategoryId)
              ?.subcategories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <PrimaryButton
          text="Add New Item"
          iconSrc="/add-icon.svg"
          onClick={() => {
            setFormData({ ...initialForm, categoryId: categories[0]?.id });
            setShowCreateModal(true);
          }}
        />

        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        <PrimaryButton
          text="Auto-Add Items"
          color="F59E0B"
          onClick={handleAutoAddClick}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ITEMS DISPLAY - Cards on Mobile / Table on Desktop */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        {displayedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--color-text-800)]">
            <img src="/no-data-icon.svg" alt="No items" className="size-16" />
            <p className="font-roboto font-semibold text-lg mt-4">No items found</p>
            <p className="font-roboto text-sm text-[var(--color-text-700)]">
              Try a different search term or filter.
            </p>
          </div>
        )}

        {/* Mobile Card Layout */}
        <div className="space-y-4 sm:hidden">
          {displayedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-sm border border-[var(--color-bg-200)] p-4 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-[var(--color-text-400)]">{item.sku}</div>
                  <div className="font-semibold text-lg text-[var(--color-text-900)] mt-1 leading-tight">
                    {item.name}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-[var(--color-text-900)]">
                    ₱{item.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-[var(--color-text-500)]">Price</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[var(--color-text-500)]">Quantity</div>
                  <div className="font-semibold text-[var(--color-text-900)]">{item.quantity}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-500)]">Unit</div>
                  <div className="font-medium">{item.unit || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-500)]">Category</div>
                  <div className="font-medium">{item.category?.name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-500)]">Subcategory</div>
                  <div className="font-medium">{item.subcategory?.name || "—"}</div>
                </div>
              </div>

              <div className="flex justify-end mt-5 pt-3 border-t border-[var(--color-bg-200)]">
                <img
                  src="/delete-icon.svg"
                  alt="Delete"
                  className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => confirmDelete(item)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden sm:block overflow-x-auto rounded-lg">
          <table className="min-w-full bg-white shadow-md table-auto border-collapse">
            <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
              <tr>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-36 truncate">SKU</th>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-56 truncate">Name</th>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28">Price</th>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-20">Qty</th>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-32 hidden md:table-cell">Category</th>
                <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-32 hidden md:table-cell">Subcategory</th>
                <th className="py-3 px-4 text-left font-bold w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="font-roboto divide-y divide-[var(--color-bg-100)]">
              {displayedItems.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--color-bg-50)] transition-colors">
                  <td className="py-4 px-4 font-mono text-[var(--color-text-500)] border-r border-[var(--color-bg-300)]">{item.sku}</td>
                  <td className="py-4 px-4 font-semibold text-[var(--color-text-900)] border-r border-[var(--color-bg-300)]">{item.name}</td>
                  <td className="py-4 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)]">₱{item.price.toFixed(2)}</td>
                  <td className="py-4 px-4 font-semibold text-[var(--color-text-900)] border-r border-[var(--color-bg-300)]">{item.quantity}</td>
                  <td className="py-4 px-4 text-[var(--color-text-600)] border-r border-[var(--color-bg-300)] hidden md:table-cell">{item.category?.name || "—"}</td>
                  <td className="py-4 px-4 text-[var(--color-text-600)] border-r border-[var(--color-bg-300)] hidden md:table-cell">{item.subcategory?.name || "—"}</td>
                  <td className="py-4 px-4">
                    <img
                      src="/delete-icon.svg"
                      alt="Delete"
                      className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => confirmDelete(item)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminItems;