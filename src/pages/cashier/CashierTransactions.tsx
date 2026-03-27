// [IMPORT] React & Hooks
import React from "react";
import { useAuth } from "../../context/useAuth";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useState, useEffect, useCallback, useRef } from "react";

// [IMPORT] Components
import Modal from "../../components/Modal";
import Skeleton from "../../components/Skeleton";

// ? [INTERFACES]
interface TransactionItem {
  id: number;
  itemId: number;
  itemName: string;
  priceAtSale: number;
  costAtSale: number | null;
  quantity: number;
  subtotal: number;
}

interface CashierUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface TransactionCashier {
  id: number;
  userId: number;
  user: CashierUser;
}

interface Transaction {
  id: number;
  receiptNumber: string;
  cashierId: number;
  cashier: TransactionCashier;
  totalAmount: number;
  discount: number | null;
  vatInclusive: boolean | null;
  vatRate: number | null;
  vatAmount: number | null;
  grandTotal: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  isReported: boolean | null;
  cashReceived: number;
  changeGiven: number;
  paymentMethod: "CASH" | "GCASH";
  status: "COMPLETED" | "VOIDED" | "REFUNDED";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: TransactionItem[];
}

// ? [CONSTANTS]
const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  VOIDED:    "bg-red-100 text-red-600",
  REFUNDED:  "bg-amber-100 text-amber-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  CASH:  "bg-blue-100 text-blue-700",
  GCASH: "bg-violet-100 text-violet-700",
};

type SortOption = "date-desc" | "date-asc" | "total-asc" | "total-desc";
const sortLabels: Record<SortOption, string> = {
  "date-desc":  "Newest",
  "date-asc":   "Oldest",
  "total-asc":  "Total ↑",
  "total-desc": "Total ↓",
};

// ? [HELPERS]
const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const CashierTransactions = () => {
  const { setShowTokenExpiredModal } = useAuth();
  usePageTitle("Transactions: Cashier | Happy-Pill Cafe");

  // [STATES] Core data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [submitting, setSubmitting]     = useState(false);

  // [STATES] Filter & sort
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [sortOption, setSortOption]     = useState<SortOption>("date-desc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // [STATES] Detail view
  const [viewingTxn, setViewingTxn] = useState<Transaction | null>(null);

  // [STATES] Void Modal
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidTarget, setVoidTarget]       = useState<Transaction | null>(null);

  // [STATES] Modal
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"default" | "success" | "error" | "info">("default");

  const token   = () => localStorage.getItem("token");
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // * [FETCH] Get transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/api/transactions/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to fetch transactions");
      setTransactions(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // * [FETCH] Get single transaction
  const fetchSingleTransaction = async (id: number) => {
    try {
      const res = await fetch(`${apiBase}/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to fetch transaction");
      setViewingTxn(data.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // * [HANDLE] Void transaction
  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${apiBase}/api/transactions/${voidTarget.id}/void`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) {
        setShowTokenExpiredModal(true);
        return;
      }
      const data = await res.json();
      if (!data?.success) {
        setModalTitle("Void Failed");
        setModalMessage(data?.message || "Failed to void transaction");
        setModalType("error");
        setShowModal(true);
        return;
      }

      setTransactions((prev) =>
        prev.map((t) => (t.id === voidTarget.id ? { ...t, status: "VOIDED" } : t))
      );
      if (viewingTxn?.id === voidTarget.id) fetchSingleTransaction(voidTarget.id);
      setShowVoidModal(false);
      setVoidTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // [FILTER + SORT]
  const displayedTransactions = transactions
    .filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        t.receiptNumber.toLowerCase().includes(q) ||
        `${t.cashier?.user?.firstName} ${t.cashier?.user?.lastName}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesMethod = methodFilter === "ALL" || t.paymentMethod === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "date-desc":  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "total-asc":  return (a.grandTotal ?? a.totalAmount) - (b.grandTotal ?? b.totalAmount);
        case "total-desc": return (b.grandTotal ?? b.totalAmount) - (a.grandTotal ?? a.totalAmount);
      }
    });

  // ? [LOADING STATE]
  if (loading) return <Skeleton />;

  return (
    <div className="py-10 px-4 space-y-4 relative">
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

      {/* [MODAL] Confirm Void */}
      {showVoidModal && voidTarget && (
        <Modal
          isOpen={showVoidModal}
          title="Void Transaction"
          onClose={() => { setShowVoidModal(false); setVoidTarget(null); }}
          onConfirm={handleConfirmVoid}
          confirmText="Void"
          cancelText="Cancel"
        >
          <p>
            Voiding <strong>{voidTarget.receiptNumber}</strong> will restore stock for all items.
            This cannot be undone.
          </p>
        </Modal>
      )}

      {/* [PANEL] Transaction Detail Side Panel */}
      {viewingTxn && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setViewingTxn(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl border-l border-[var(--color-bg-300)] flex flex-col overflow-y-auto">

            {/* [UI] Panel Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-bg-300)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-900)] font-figtree">
                  {viewingTxn.receiptNumber}
                </h2>
                <p className="text-xs text-[var(--color-text-500)] mt-0.5 font-roboto">
                  {formatDate(viewingTxn.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setViewingTxn(null)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-200)] text-[var(--color-text-500)] transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* [UI] Panel Body */}
            <div className="flex-1 px-6 py-5 space-y-5 font-roboto">

              {/* [UI] Status badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[viewingTxn.status]}`}>
                  {viewingTxn.status}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PAYMENT_STYLES[viewingTxn.paymentMethod]}`}>
                  {viewingTxn.paymentMethod}
                </span>
                {viewingTxn.isReported && (
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    Reported
                  </span>
                )}
              </div>

              {/* [UI] Cashier info */}
              <div className="bg-[var(--color-bg-50)] rounded-lg p-4 border border-[var(--color-bg-300)]">
                <p className="text-xs font-semibold text-[var(--color-text-500)] uppercase tracking-wider mb-1">Cashier</p>
                <p className="font-semibold text-[var(--color-text-800)]">
                  {viewingTxn.cashier?.user?.firstName} {viewingTxn.cashier?.user?.lastName}
                </p>
                <p className="text-xs text-[var(--color-text-500)]">{viewingTxn.cashier?.user?.email}</p>
              </div>

              {/* [UI] Items table */}
              <div>
                <p className="text-xs font-semibold text-[var(--color-text-500)] uppercase tracking-wider mb-2">Items</p>
                <table className="min-w-full bg-white shadow-sm table-auto border-collapse rounded-lg overflow-hidden">
                  <thead className="bg-[var(--color-primary-600)] text-white">
                    <tr>
                      {["Item", "Qty", "Price", "Subtotal"].map((h) => (
                        <th key={h} className="py-2 px-3 text-left text-xs font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingTxn.items.map((item) => (
                      <tr key={item.id} className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)]">
                        <td className="py-2 px-3 text-sm text-[var(--color-text-800)] font-medium">{item.itemName}</td>
                        <td className="py-2 px-3 text-sm text-[var(--color-text-600)]">{item.quantity}</td>
                        <td className="py-2 px-3 text-sm text-[var(--color-text-600)]">{formatCurrency(item.priceAtSale)}</td>
                        <td className="py-2 px-3 text-sm text-[var(--color-text-800)] font-semibold">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* [UI] Financials breakdown */}
              <div className="bg-[var(--color-bg-50)] rounded-lg border border-[var(--color-bg-300)] p-4 space-y-2 text-sm">
                {[
                  { label: "Subtotal",      value: formatCurrency(viewingTxn.totalAmount) },
                  { label: "Discount",      value: `- ${formatCurrency(viewingTxn.discount ?? 0)}` },
                  { label: "VAT Amount",    value: formatCurrency(viewingTxn.vatAmount ?? 0) },
                  { label: "Tax Amount",    value: formatCurrency(viewingTxn.taxAmount ?? 0) },
                  { label: "Grand Total",   value: formatCurrency(viewingTxn.grandTotal ?? viewingTxn.totalAmount), bold: true },
                  { label: "Cash Received", value: formatCurrency(viewingTxn.cashReceived) },
                  { label: "Change Given",  value: formatCurrency(viewingTxn.changeGiven) },
                ].map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between py-1 border-b border-[var(--color-bg-200)] last:border-0">
                    <span className="text-[var(--color-text-500)]">{label}</span>
                    <span className={bold ? "font-bold text-[var(--color-text-900)]" : "text-[var(--color-text-700)]"}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* [UI] Panel Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-bg-300)] flex gap-3">
              {viewingTxn.status !== "VOIDED" && (
                <button
                  onClick={() => { setVoidTarget(viewingTxn); setViewingTxn(null); setShowVoidModal(true); }}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white font-roboto font-medium hover:bg-amber-600 transition-colors text-sm"
                >
                  Void Transaction
                </button>
              )}
              <button
                onClick={() => setViewingTxn(null)}
                className="flex-1 py-2 rounded-lg border border-[var(--color-bg-300)] text-[var(--color-text-700)] font-roboto font-medium hover:bg-[var(--color-bg-100)] transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [SECTION] Header */}
      <div className="flex flex-col items-center justify-between">
        <h1 className="font-bold text-2xl">Transactions</h1>
      </div>

      {/* [SECTION] Search Bar & Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-2 relative flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search receipt # or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 pl-4 pr-3 outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />
        </div>

        {/* [SECTION] Sort dropdown */}
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

        {/* [SECTION] Status Filter Pills */}
        <div className="flex items-center gap-1">
          {["ALL", "COMPLETED", "VOIDED", "REFUNDED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-sm text-xs font-roboto font-medium transition-colors border ${
                statusFilter === s
                  ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                  : "bg-[var(--color-bg-50)] text-[var(--color-text-700)] border-[var(--color-bg-300)] hover:bg-[var(--color-bg-200)]"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* [SECTION] Method Filter Pills */}
        <div className="flex w-full items-center gap-1">
          {["ALL", "CASH", "GCASH"].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-sm text-xs font-roboto font-medium transition-colors border ${
                methodFilter === m
                  ? "bg-[var(--color-primary-600)] text-white border-[var(--color-primary-600)]"
                  : "bg-[var(--color-bg-50)] text-[var(--color-text-700)] border-[var(--color-bg-300)] hover:bg-[var(--color-bg-200)]"
              }`}
            >
              {m === "ALL" ? "All Methods" : m}
            </button>
          ))}
        </div>
      </div>

      {/* [SECTION] Transactions Table */}
      <div className="overflow-x-auto mt-4 rounded-lg">
        {error && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center text-red-600">
            <p className="font-roboto font-semibold text-lg">{error}</p>
          </div>
        )}

        {!error && displayedTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 space-y-2 text-center text-[var(--color-text-800)]">
            <img src="/no-data-icon.svg" alt="No transactions" className="size-16" />
            <p className="font-roboto font-semibold text-lg">No transactions found</p>
            <p className="font-roboto text-sm text-[var(--color-text-700)]">
              Try searching for a different receipt number or cashier name.
            </p>
          </div>
        )}

        {!error && displayedTransactions.length > 0 && (
          <table className="min-w-full bg-white shadow-md table-auto border-collapse">
            <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
              <tr>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-36">Receipt #</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-36 hidden sm:table-cell">Date</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28">Total</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-24 hidden sm:table-cell">Method</th>
                <th className="py-2 px-4 text-left font-bold border-r border-[var(--color-primary-600)] w-28">Status</th>
                <th className="py-2 px-4 text-left font-bold">Actions</th>
              </tr>
            </thead>

            <tbody className="font-roboto">
              {displayedTransactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="border-t border-[var(--color-bg-100)] hover:bg-[var(--color-bg-50)] transition-colors duration-200 ease-in-out"
                >
                  <td className="text-sm py-2 px-4 border-r border-[var(--color-bg-300)]">
                    <button
                      onClick={() => fetchSingleTransaction(txn.id)}
                      className="font-mono text-xs text-[var(--color-primary-600)] hover:underline font-semibold"
                    >
                      {txn.receiptNumber}
                    </button>
                  </td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-500)] border-r border-[var(--color-bg-300)] hidden sm:table-cell whitespace-nowrap">
                    {formatDate(txn.createdAt)}
                  </td>
                  <td className="text-sm py-2 px-4 text-[var(--color-text-900)] border-r border-[var(--color-bg-300)] font-semibold">
                    {formatCurrency(txn.grandTotal ?? txn.totalAmount)}
                  </td>
                  <td className="text-sm py-2 px-4 border-r border-[var(--color-bg-300)] hidden sm:table-cell">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAYMENT_STYLES[txn.paymentMethod]}`}>
                      {txn.paymentMethod}
                    </span>
                  </td>
                  <td className="text-sm py-2 px-4 border-r border-[var(--color-bg-300)]">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[txn.status]}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 flex justify-center items-center gap-2">
                    {/* [ACTION] View */}
                    <img
                      src="/edit-filled-icon.svg"
                      alt="View"
                      className="w-5 h-5 cursor-pointer"
                      onClick={() => fetchSingleTransaction(txn.id)}
                    />
                    {/* [ACTION] Void */}
                    {txn.status !== "VOIDED" && (
                      <button
                        title="Void Transaction"
                        onClick={() => { setVoidTarget(txn); setShowVoidModal(true); }}
                        className="text-amber-500 hover:text-amber-700 font-bold text-base leading-none cursor-pointer"
                      >
                        ⊘
                      </button>
                    )}
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

export default CashierTransactions;