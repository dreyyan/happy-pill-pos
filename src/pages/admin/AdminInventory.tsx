// [IMPORT] React & Hooks
import { useState, useEffect, useCallback, useRef } from "react";
import React from "react";

// [IMPORT] Components
import PrimaryButton from "../../components/PrimaryButton";
import CrudModal from "../../components/CrudModal";
import Modal from "../../components/Modal";

// ─────────────────────────────────────────────────────────────────────────────
// ?[INTERFACES]
// ─────────────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  unit: string | null;
  isActive: boolean;
}

interface LogCreatedBy {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface InventoryLog {
  id: number;
  itemId: number;
  item: InventoryItem;
  type: "STOCK_IN" | "STOCK_OUT";
  quantity: number;
  isActive: boolean;
  createdAt: string;
  createdById: number | null;
  createdBy: LogCreatedBy | null;
}

interface LogForm {
  itemId: string;
  type: string;
  quantity: string;
  createdById: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ?[CONSTANTS]
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<string, string> = {
  STOCK_IN:  "bg-green-100 text-green-700",
  STOCK_OUT: "bg-red-100 text-red-600",
};

const TYPE_ICONS: Record<string, string> = {
  STOCK_IN:  "↑",
  STOCK_OUT: "↓",
};

type SortOption = "date-desc" | "date-asc" | "qty-asc" | "qty-desc";
const sortLabels: Record<SortOption, string> = {
  "date-desc": "Newest",
  "date-asc":  "Oldest",
  "qty-asc":   "Qty ↑",
  "qty-desc":  "Qty ↓",
};

// ─────────────────────────────────────────────────────────────────────────────
// ?[HELPERS]
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const emptyForm = (): LogForm => ({ itemId: "", type: "STOCK_IN", quantity: "", createdById: "" });

// ─────────────────────────────────────────────────────────────────────────────
// [COMPONENT]
// ─────────────────────────────────────────────────────────────────────────────

const AdminInventory = () => {
  // [STATES] Core data
  const [logs, setLogs]       = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // [STATES] Filter & sort
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // [STATES] Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formError, setFormError]             = useState("");

  // [STATES] Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLog, setSelectedLog]     = useState<InventoryLog | null>(null);

  // [STATES] Delete / Restore Modals
  const [showDeleteModal, setShowDeleteModal]   = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [deleteTarget, setDeleteTarget]         = useState<InventoryLog | null>(null);
  const [restoreTarget, setRestoreTarget]       = useState<InventoryLog | null>(null);

  // [STATES] Form
  const initialForm: LogForm = emptyForm();
  const [formData, setFormData] = useState<LogForm>(initialForm);

  const token   = () => localStorage.getItem("token");
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // ── [STATES] Inventory items for search ───────────────────────────────
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [itemSearch, setItemSearch] = useState(""); // search query for items
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  // NEW: Control dropdown visibility
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  // ── Data ─────────────────────────────────────────────────────────────────

// ── [EFFECT] Close item dropdown when clicking outside ─────────────────────
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target as Node)) {
      setShowItemDropdown(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  // ── [EFFECT] Fetch all inventory items once ─────────────────────────
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(`${apiBase}/api/items/`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const data = await res.json();
        if (data?.success) setAllItems(data.data);
      } catch (err) {
        console.error("Failed to fetch items", err);
      }
    };
    fetchItems();
  }, [apiBase]);

  // ── [EFFECT] Filter items based on search query ───────────────────────
  useEffect(() => {
    const q = itemSearch.toLowerCase();
    setFilteredItems(
      allItems.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku?.toLowerCase().includes(q)
      )
    );
  }, [itemSearch, allItems]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/api/inventory/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { alert("Session expired. Please login again."); return; }
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to fetch inventory logs");
      setLogs(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  // *[HANDLE] Create log
  const handleCreateLog = async () => {
    setFormError("");
    if (!formData.itemId || !formData.quantity) {
      setFormError("Item ID and quantity are required.");
      return;
    }
    if (Number(formData.quantity) <= 0) {
      setFormError("Quantity must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${apiBase}/api/inventory/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          itemId: Number(formData.itemId),
          type: formData.type,
          quantity: Number(formData.quantity),
          createdById: formData.createdById ? Number(formData.createdById) : undefined,
        }),
      });

      if (res.status === 401) { alert("Session expired."); return; }
      const data = await res.json();

      if (!data?.success) {
        setFormError(data?.message || "Failed to create log");
        return;
      }

      // Refresh both logs and items so quantity updates in UI
      await fetchLogs();
      // Optional: refetch items if you show current quantity elsewhere
      // await fetchItems(); // you can extract fetchItems if needed

      setShowCreateModal(false);
      setFormData(initialForm);
      setItemSearch("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // *[HANDLE] Edit log
  const handleEditLog = async () => {
    if (!selectedLog) return;
    setFormError("");
    if (!formData.quantity || Number(formData.quantity) <= 0) { setFormError("Quantity must be greater than 0."); return; }

    try {
      setSubmitting(true);
      const res = await fetch(`${apiBase}/api/inventory/${selectedLog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ type: formData.type, quantity: Number(formData.quantity) }),
      });
      if (res.status === 401) { alert("Session expired."); return; }
      const data = await res.json();
      if (!data?.success) { await fetchLogs(); setFormError(data?.message || "Failed to update log"); setFormData(initialForm); return; }

      setLogs((prev) => prev.map((l) => (l.id === selectedLog.id ? data.data : l)));
      setShowEditModal(false);
      setSelectedLog(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // *[HANDLE] Deactivate log
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${apiBase}/api/inventory/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data?.success) { alert(data?.message || "Failed to deactivate log"); return; }
      setLogs((prev) => prev.map((l) => (l.id === deleteTarget.id ? { ...l, isActive: false } : l)));
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // *[HANDLE] Restore log
  const handleConfirmRestore = async () => {
    if (!restoreTarget) return;
    try {
      const res = await fetch(`${apiBase}/api/inventory/${restoreTarget.id}/restore`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!data?.success) { alert(data?.message || "Failed to restore log"); return; }
      setLogs((prev) => prev.map((l) => (l.id === restoreTarget.id ? { ...l, isActive: true } : l)));
      setShowRestoreModal(false);
      setRestoreTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  // ── Filter + Sort ─────────────────────────────────────────────────────────

  const displayedLogs = logs
    .filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch =
        log.item?.name?.toLowerCase().includes(q) ||
        log.item?.sku?.toLowerCase().includes(q) ||
        `${log.createdBy?.firstName} ${log.createdBy?.lastName}`.toLowerCase().includes(q);
      const matchesType = typeFilter === "ALL" || log.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "date-desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "qty-asc":   return a.quantity - b.quantity;
        case "qty-desc":  return b.quantity - a.quantity;
      }
    });

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <p>Loading inventory...</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="py-10 px-4 space-y-4 relative">

      {/* [MODAL] Confirm Deactivate */}
      {showDeleteModal && deleteTarget && (
        <Modal
          isOpen={showDeleteModal}
          title="Deactivate Log"
          onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
          onConfirm={handleConfirmDelete}
          confirmText="Deactivate"
          cancelText="Cancel"
        >
          <p>
            Are you sure you want to deactivate Log <strong>#{deleteTarget.id}</strong> for{" "}
            <strong>{deleteTarget.item?.name}</strong>? You can restore it later.
          </p>
        </Modal>
      )}

      {/* [MODAL] Confirm Restore */}
      {showRestoreModal && restoreTarget && (
        <Modal
          isOpen={showRestoreModal}
          title="Restore Log"
          onClose={() => { setShowRestoreModal(false); setRestoreTarget(null); }}
          onConfirm={handleConfirmRestore}
          confirmText="Restore"
          cancelText="Cancel"
        >
          <p>
            Restore Log <strong>#{restoreTarget.id}</strong> for{" "}
            <strong>{restoreTarget.item?.name}</strong> back to active?
          </p>
        </Modal>
      )}

      {/* [MODAL] Create Log */}
      <CrudModal<LogForm>
        isOpen={showCreateModal}
        title="Create Log"
        onClose={() => {
          setShowCreateModal(false);
          setFormError("");
          setItemSearch("");
          setShowItemDropdown(false);   // ← NEW: close dropdown
          setFormData(initialForm);
        }}
        onConfirm={handleCreateLog}
        loading={submitting}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          {
            key: "itemId",
            label: "Select Item",
            type: "text",
            value: itemSearch,
            onChange: (value) => setItemSearch(value),
            render: () => (
              <div className="relative" ref={itemDropdownRef}>   {/* ← Add ref here */}
                <input
                  type="text"
                  placeholder="Search item by name or SKU..."
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    setShowItemDropdown(true);        // ← Show dropdown when typing
                  }}
                  onFocus={() => setShowItemDropdown(true)} // ← Show when focused
                  className="w-full bg-[var(--color-bg-50)]  font-roboto rounded-sm py-2 pl-4 pr-3 outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
                />

                {/* Dropdown List */}
                {showItemDropdown && filteredItems.length > 0 && (
                  <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto bg-white border border-[var(--color-bg-300)] rounded shadow-lg">
                    {filteredItems.map((item) => (
                      <li
                        key={item.id}
                        className="px-3 py-2 text-sm hover:bg-[var(--color-bg-200)] cursor-pointer"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, itemId: String(item.id) }));
                          setItemSearch(item.name);
                          setShowItemDropdown(false);   // ← CLOSE dropdown after select
                        }}
                      >
                        <span className="font-semibold">{item.name}</span>{" "}
                        <span className="text-[var(--color-text-500)] font-mono">
                          ({item.sku ?? "—"})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* No results message */}
                {showItemDropdown && filteredItems.length === 0 && itemSearch.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--color-bg-300)] rounded shadow-lg p-3 text-sm text-[var(--color-text-500)]">
                    No items found
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "type",
            label: "Type",
            type: "select",
            options: [
              { label: "Stock In", value: "STOCK_IN" },
              { label: "Stock Out", value: "STOCK_OUT" },
            ],
            value: formData.type,
            onChange: (value) => setFormData((prev) => ({ ...prev, type: String(value) })),
          },
          { key: "quantity", label: "Quantity", type: "number" },
          { key: "createdById", label: "Logged By (User ID, optional)", type: "number" },
        ]}
      />
      {/* [MODAL] Edit Log */}
      <CrudModal<LogForm>
        isOpen={showEditModal}
        title="Edit Log"
        onClose={() => { setShowEditModal(false); setFormError(""); setSelectedLog(null); }}
        onConfirm={handleEditLog}
        loading={submitting}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          {
            key: "type",
            label: "Type",
            type: "select",
            options: [
              { label: "Stock In",  value: "STOCK_IN"  },
              { label: "Stock Out", value: "STOCK_OUT" },
            ],
            value: formData.type,
            onChange: (value) => setFormData((prev) => ({ ...prev, type: String(value) })),
          },
          { key: "quantity", label: "Quantity", type: "number" },
        ]}
      />

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Inventory Logs</h1>
      </div>

      {/* [SECTION] Search, Type Filter & Sort */}
      <div className="flex items-center gap-4 mt-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by item name, SKU, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 pl-4 pr-3 outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />
        </div>

        {/* Sort dropdown */}
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
      
      {/* Type filter pills */}
      <div className="flex justify-end items-center gap-1">
        {["ALL", "STOCK_IN", "STOCK_OUT"].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-sm text-xs font-roboto font-medium transition-colors border ${
              typeFilter === t
                ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                : "bg-[var(--color-bg-50)] text-[var(--color-text-700)] border-[var(--color-bg-300)] hover:bg-[var(--color-bg-200)]"
            }`}
          >
            {t === "ALL" ? "All" : t === "STOCK_IN" ? "↑ In" : "↓ Out"}
          </button>
        ))}
      </div>

      <PrimaryButton
        text="New Log"
        iconSrc="/add-icon.svg"
        onClick={() => {
          setFormData(initialForm);
          setShowCreateModal(true);
        }}
      />

{/* [SECTION] Logs Table */}
<div className="mt-4 rounded-lg">
  {displayedLogs.length === 0 && (
    <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center text-[var(--color-text-800)]">
      <img src="/no-data-icon.svg" alt="No logs" className="size-16" />
      <p className="font-roboto font-semibold text-lg">No inventory logs found</p>
      <p className="font-roboto text-sm text-[var(--color-text-700)]">
        Try searching for a different item name, SKU, or user.
      </p>
    </div>
  )}

  {displayedLogs.length > 0 && (
    <>
      {/* Mobile Card Layout (below sm) */}
      <div className="space-y-4 sm:hidden">
        {displayedLogs.map((log) => (
          <div
            key={log.id}
            className={`bg-white rounded-xl shadow-sm border border-[var(--color-bg-200)] p-4 transition-all hover:shadow-md ${!log.isActive ? "opacity-60" : ""}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="text-xs text-[var(--color-text-400)] font-mono">#{log.id}</div>
                <div className="font-semibold text-[var(--color-text-900)] mt-0.5 leading-tight">
                  {log.item?.name ?? "—"}
                </div>
              </div>

              <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${TYPE_STYLES[log.type]}`}>
                {TYPE_ICONS[log.type]} {log.type.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <div className="text-xs text-[var(--color-text-500)]">Quantity</div>
                <div className="font-semibold text-[var(--color-text-900)]">{log.quantity}</div>
              </div>

              {log.item?.sku && (
                <div>
                  <div className="text-xs text-[var(--color-text-500)]">SKU</div>
                  <div className="font-mono text-[var(--color-text-500)]">{log.item.sku}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-[var(--color-text-500)]">Logged By</div>
                <div className="text-[var(--color-text-600)]">
                  {log.createdBy ? `${log.createdBy.firstName} ${log.createdBy.lastName}` : "System"}
                </div>
              </div>

              <div>
                <div className="text-xs text-[var(--color-text-500)]">Date</div>
                <div className="text-[var(--color-text-500)] text-sm">{formatDate(log.createdAt)}</div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-bg-200)]">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                log.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${log.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                {log.isActive ? "Active" : "Inactive"}
              </span>

              <div className="flex items-center gap-4">
                <img
                  src="/edit-filled-icon.svg"
                  alt="Edit"
                  className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setSelectedLog(log);
                    setFormData({
                      itemId: String(log.itemId),
                      type: log.type,
                      quantity: String(log.quantity),
                      createdById: log.createdById ? String(log.createdById) : "",
                    });
                    setShowEditModal(true);
                  }}
                />

                {log.isActive ? (
                  <img
                    src="/delete-icon.svg"
                    alt="Deactivate"
                    className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => { setDeleteTarget(log); setShowDeleteModal(true); }}
                  />
                ) : (
                  <button
                    title="Restore"
                    onClick={() => { setRestoreTarget(log); setShowRestoreModal(true); }}
                    className="text-green-600 hover:text-green-800 text-2xl font-bold leading-none"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table Layout (sm and above) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full bg-white shadow-md table-auto border-collapse w-full">
          <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
            <tr>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-12">#</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)]">Item</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-32">SKU</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-36">Type</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-20">Qty</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-40">Logged By</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-44">Date</th>
              <th className="py-3 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28">Status</th>
              <th className="py-3 px-4 text-left font-bold w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="font-roboto divide-y divide-[var(--color-bg-100)]">
            {displayedLogs.map((log) => (
              <tr
                key={log.id}
                className={`hover:bg-[var(--color-bg-50)] transition-colors ${!log.isActive ? "opacity-50" : ""}`}
              >
                <td className="py-4 px-4 text-[var(--color-text-400)] font-mono border-r border-[var(--color-bg-300)]">#{log.id}</td>
                <td className="py-4 px-4 text-[var(--color-text-900)] font-semibold border-r border-[var(--color-bg-300)]">{log.item?.name ?? "—"}</td>
                <td className="py-4 px-4 text-[var(--color-text-500)] font-mono border-r border-[var(--color-bg-300)]">{log.item?.sku ?? "—"}</td>
                <td className="py-4 px-4 border-r border-[var(--color-bg-300)]">
                  <span className={`inline-block text-xs font-semibold px-3.5 py-1 rounded-full ${TYPE_STYLES[log.type]}`}>
                    {TYPE_ICONS[log.type]} {log.type.replace("_", " ")}
                  </span>
                </td>
                <td className="py-4 px-4 text-[var(--color-text-900)] font-semibold border-r border-[var(--color-bg-300)]">{log.quantity}</td>
                <td className="py-4 px-4 text-[var(--color-text-600)] border-r border-[var(--color-bg-300)]">
                  {log.createdBy ? `${log.createdBy.firstName} ${log.createdBy.lastName}` : "System"}
                </td>
                <td className="py-4 px-4 text-[var(--color-text-500)] border-r border-[var(--color-bg-300)] whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
                <td className="py-4 px-4 border-r border-[var(--color-bg-300)]">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                    log.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${log.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                    {log.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/edit-filled-icon.svg"
                      alt="Edit"
                      className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setSelectedLog(log);
                        setFormData({
                          itemId: String(log.itemId),
                          type: log.type,
                          quantity: String(log.quantity),
                          createdById: log.createdById ? String(log.createdById) : "",
                        });
                        setShowEditModal(true);
                      }}
                    />
                    {log.isActive ? (
                      <img
                        src="/delete-icon.svg"
                        alt="Deactivate"
                        className="w-5 h-5 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => { setDeleteTarget(log); setShowDeleteModal(true); }}
                      />
                    ) : (
                      <button
                        title="Restore"
                        onClick={() => { setRestoreTarget(log); setShowRestoreModal(true); }}
                        className="text-green-600 hover:text-green-800 text-2xl font-bold leading-none"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>
    </div>
  );
};

export default AdminInventory;