// [IMPORT] React & Hooks
import { useAuth } from "../../context/useAuth";
import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "../../hooks/usePageTitle";

// [IMPORT] Components
import React from "react";
import Modal from "../../components/Modal";
import CrudModal from "../../components/CrudModal";
import PrimaryButton from "../../components/PrimaryButton";

const AdminItems = () => {
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Items: Admin | Happy-Pill Cafe");

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

  // [STATE] Mobile Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const MOBILE_PAGE_SIZE = 3;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // [STATE] CSV Profile
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // [STATE] Form
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

  // [TYPES] Sort options
  type SortOption = 
    | "name-asc" 
    | "name-desc" 
    | "sku-asc" 
    | "sku-desc" 
    | "price-asc" 
    | "price-desc";

  // [LABELS] Display names for sorting
  const sortLabels: Record<SortOption, string> = {
    "name-asc": "Name (A → Z)",
    "name-desc": "Name (Z → A)",
    "sku-asc": "SKU (A → Z)",
    "sku-desc": "SKU (Z → A)",
    "price-asc": "Price (Low → High)",
    "price-desc": "Price (High → Low)",
  };

  // [HANDLE] CSV selection
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // * [HANDLE] Upload CSV and Auto-Create Items
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

      const formDataObj = new FormData();
      formDataObj.append("file", csvFile);

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
        const cleanMessage = data.message?.replace(/^\[ERROR\]\s*/, "") || "Failed to upload CSV";
        throw new Error(cleanMessage);
      }

      // * [SUCCESS] CSV uploaded
      setModalTitle("Success");
      setModalMessage(`Successfully imported ${data.data.createdCount} items from CSV!`);
      setModalType("success");
      setShowModal(true);

      // Refresh items list after import
      const resRefresh = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const refreshData = await resRefresh.json();
      if (refreshData.success) setItems(refreshData.data);

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

  // [DERIVED] Mobile paginated slice of displayedItems
  const totalPages = Math.ceil(displayedItems.length / MOBILE_PAGE_SIZE);
  const paginatedMobileItems = displayedItems.slice(
    (currentPage - 1) * MOBILE_PAGE_SIZE,
    currentPage * MOBILE_PAGE_SIZE
  );

  // [HANDLERS] Mobile pagination
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  // [EFFECT] Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortOption, filterCategoryId, filterSubcategoryId]);

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
      </div>

      {/* [SECTION] Pagination - Mobile only */}
      {displayedItems.length > 0 && (
        <div className="flex justify-between items-center space-x-4 mt-4 sm:hidden">
          {/* [BUTTON] Previous */}
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`text-button px-3 py-2 rounded ${
              currentPage === 1 ? "bg-gray-300 cursor-not-allowed" : "bg-primary-500 text-white hover:opacity-90"
            }`}
          >
            &lt; Prev
          </button>
          {/* [UI] Current Page */}
          <span>Page {currentPage} of {totalPages}</span>
          {/* [BUTTON] Next */}
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`text-button px-3 py-2 rounded ${
              currentPage === totalPages ? "bg-gray-300 cursor-not-allowed" : "bg-primary-500 text-white hover:opacity-90"
            }`}
          >
            Next &gt;
          </button>
        </div>
      )}

      {/* [SECTION] Items display */}
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
          {paginatedMobileItems.map((item) => (
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

        {/* [SECTION] Items */}
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
      {/* [SECTION] CSV Upload */}
      <div className="w-full max-w-md bg-bg-100 border border-bg-300 rounded-lg shadow-sm p-5 space-y-4">
        <h3 className="text-text-700 font-semibold">Auto-Add Items (CSV)</h3>
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
        <PrimaryButton text={`${uploading ? "Uploading..." : "Upload CSV & Add Items"}`} onClick={handleUploadCsv} disabled={uploading} />
      </div>
    </div>
  );
};

export default AdminItems;