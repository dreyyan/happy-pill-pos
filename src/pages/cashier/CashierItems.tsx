// [IMPORT] Hooks
import React from "react";
import { useAuth } from "../../context/useAuth";
import { useState, useEffect, useRef } from "react";

// [IMPORT] Components
import Modal from "../../components/Modal";
import { usePageTitle } from "../../hooks/usePageTitle";

const CashierItems = () => {
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Items: Cashier | Happy-Pill Cafe");

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

  // [STATE] Department Filter
  const [filterDepartment, setFilterDepartment] = useState<"RESTOBAR" | "CAFE" | "ALL">("ALL");

  // [STATE] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  // [STATE] Categories
  const [categories, setCategories] = useState<Category[]>([]);

  // [STATE] Mobile Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const MOBILE_PAGE_SIZE = 3;

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
  usePageTitle(`Items: Cashier | ${businessName}`);

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

  // [FILTER] Items
  const filteredItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    )
    .filter((item) => (filterDepartment === "ALL" ? true : item.department === filterDepartment))
    .filter((item) => (filterCategoryId ? item.category?.id === filterCategoryId : true))
    .filter((item) => (filterSubcategoryId ? item.subcategory?.id === filterSubcategoryId : true));

  // [FILTER] Categories
  const filteredCategories = categories.filter((cat) =>
    filteredItems.some((item) => item.category?.id === cat.id)
  );

  // [FILTER] Subcategories
  const selectedCategory = categories.find((c) => c.id === filterCategoryId);
  const filteredSubcategories =
    selectedCategory?.subcategories.filter((sub: { id: any; }) =>
      filteredItems.some((item) => item.subcategory?.id === sub.id)
    ) ?? [];

  // [FILTER] Filtered Items
  const displayedItems = filteredItems.sort((a, b) => {
    switch (sortOption) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "sku-asc": return a.sku.localeCompare(b.sku);
      case "sku-desc": return b.sku.localeCompare(a.sku);
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      default: return 0;
    }
  });

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

  if (loading) return <p>Loading items...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4 relative">
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

      {/* Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Items Catalog</h1>
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

      <div className="flex flex-wrap gap-2 mt-4">
        {/* [FILTER] Department */}
        <select
          className="flex-1 min-w-[140px] bg-[var(--color-bg-50)] rounded-sm py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary-600)]"
          value={filterDepartment}
          onChange={(e) => {
            setFilterDepartment(e.target.value as "RESTOBAR" | "CAFE" | "ALL");
            setFilterCategoryId(null);
            setFilterSubcategoryId(null);
          }}
        >
          <option value="ALL">All Departments</option>
          <option value="RESTOBAR">Restobar</option>
          <option value="CAFE">Cafe</option>
        </select>

        {/* [FILTER] Category */}
        <select
          className="flex-1 min-w-[140px] bg-[var(--color-bg-50)] rounded-sm py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary-600)]"
          value={filterCategoryId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value) || null;
            setFilterCategoryId(id);
            setFilterSubcategoryId(null);
          }}
        >
          <option value="">All Categories</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* [FILTER] Subcategory */}
        <select
          className="flex-1 min-w-[140px] bg-[var(--color-bg-50)] rounded-sm py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary-600)]"
          value={filterSubcategoryId ?? ""}
          onChange={(e) =>
            setFilterSubcategoryId(e.target.value ? +e.target.value : null)
          }
          disabled={!filterCategoryId}
        >
          <option value="">All Subcategories</option>
          {filteredSubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
            </div>
          ))}
        </div>

        {/* [SECTION] Desktop Table */}
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
                <th className="py-3 px-4 text-left font-bold w-20">Unit</th>
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
                  <td className="py-4 px-4 text-[var(--color-text-600)] border-r border-[var(--color-bg-300)]">{item.unit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CashierItems;