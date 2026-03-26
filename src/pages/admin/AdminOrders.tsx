import { useState, useEffect, useCallback, useRef } from "react";

import PrimaryButton from "../../components/PrimaryButton";
import CrudModal from "../../components/CrudModal";
import React from "react";

// ? [INTERFACES]
interface Order {
  id: number;
  status: string;
  totalAmount: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orderItems: any[];
  createdAt: string;
  isActive: boolean;
  customer: {
    id: number;
    tableNumber: number;
    firstName: string;
    pax?: number;
  };
}

interface CreateOrderForm {
  tableNumber: string;
  firstName: string;
  pax: string;
  status: string;
}

interface ItemForOrder {
  id: number;
  name: string;
  price: number;
  sku?: string;
  quantity: number;
}

type SortOption = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-purple-100 text-purple-700",
  READY: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const ALL_STATUS_OPTIONS = [
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Preparing", value: "PREPARING" },
  { label: "Ready", value: "READY" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const sortLabels: Record<SortOption, string> = {
  "date-desc": "Newest First",
  "date-asc": "Oldest First",
  "amount-desc": "Highest Amount",
  "amount-asc": "Lowest Amount",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allItems, setAllItems] = useState<ItemForOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [showSortFilters, setShowSortFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Create/Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState<CreateOrderForm>({
    tableNumber: "",
    firstName: "",
    pax: "",
    status: "PENDING",
  });
  const [selectedOrderItems, setSelectedOrderItems] = useState<{
    itemId: number;
    name: string;
    price: number;
    quantity: number;
  }[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  // Quick Status Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editFormData, setEditFormData] = useState({ status: "PENDING" });

  const token = () => localStorage.getItem("token");
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // Fetch Data
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/orders/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data?.success) setOrders(data.data);
    } catch {
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const fetchItems = async () => {
    try {
      const res = await fetch(`${apiBase}/api/items/`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data?.success) setAllItems(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchItems();
  }, [fetchOrders]);

  // Open Modal for Create or Full Edit
  const openOrderModal = (order?: Order) => {
    if (order) {
      // Edit mode - only allow if not completed
      if (order.status === "COMPLETED") {
        alert("Completed orders cannot be edited.");
        return;
      }
      setIsEditing(true);
      setEditingOrderId(order.id);
      setFormData({
        tableNumber: order.customer.tableNumber.toString(),
        firstName: order.customer.firstName,
        pax: order.customer.pax?.toString() || "",
        status: order.status,
      });
      setSelectedOrderItems(
        order.orderItems.map((oi) => ({
          itemId: oi.itemId,
          name: oi.itemName || "Unknown",
          price: oi.priceAtOrder,
          quantity: oi.quantity,
        }))
      );
    } else {
      // Create mode
      setIsEditing(false);
      setEditingOrderId(null);
      setFormData({ tableNumber: "", firstName: "", pax: "", status: "PENDING" });
      setSelectedOrderItems([]);
    }
    setFormError("");
    setItemSearch("");
    setShowCreateModal(true);
  };

  // Save Order (Create or Update)
  const handleSaveOrder = async () => {
    setFormError("");
    if (!formData.tableNumber || !formData.firstName) {
      setFormError("Table Number and Guest Name are required");
      return;
    }
    if (selectedOrderItems.length === 0) {
      setFormError("Please add at least one item");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        tableNumber: Number(formData.tableNumber),
        firstName: formData.firstName.trim(),
        pax: formData.pax ? Number(formData.pax) : null,
        status: formData.status,
        orderItems: selectedOrderItems.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      };

      let res;
      if (isEditing && editingOrderId) {
        res = await fetch(`${apiBase}/api/orders/${editingOrderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${apiBase}/api/orders/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!data?.success) {
        setFormError(data.message || "Failed to save order");
        return;
      }

      if (isEditing) {
        setOrders((prev) => prev.map((o) => (o.id === editingOrderId ? data.data : o)));
      } else {
        setOrders((prev) => [data.data, ...prev]);
      }

      setShowCreateModal(false);
      setSelectedOrderItems([]);
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status (Quick)
  const handleUpdateStatus = async () => {
    if (!editingOrder) return;
    setFormError("");

    try {
      setSubmitting(true);
      const res = await fetch(`${apiBase}/api/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: editFormData.status }),
      });

      const data = await res.json();
      if (!data?.success) {
        setFormError(data.message || "Failed to update status");
        return;
      }

      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? data.data : o)));
      setShowEditModal(false);
      setEditingOrder(null);
    } catch {
      setFormError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Soft Delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const res = await fetch(`${apiBase}/api/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data?.success) {
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } else {
        alert(data.message || "Failed to delete order");
      }
    } catch (err) {
      alert("Something went wrong while deleting the order");
    }
  };

  // Item Management with Stock Check
  const addItem = (item: ItemForOrder) => {
    const existing = selectedOrderItems.find((i) => i.itemId === item.id);
    const newQty = existing ? existing.quantity + 1 : 1;

    if (newQty > item.quantity) {
      alert(`Not enough stock for "${item.name}". Only ${item.quantity} available.`);
      return;
    }

    if (existing) {
      setSelectedOrderItems((prev) =>
        prev.map((i) => (i.itemId === item.id ? { ...i, quantity: newQty } : i))
      );
    } else {
      setSelectedOrderItems((prev) => [
        ...prev,
        { itemId: item.id, name: item.name, price: item.price, quantity: 1 },
      ]);
    }
  };

  const changeQuantity = (itemId: number, qty: number) => {
    if (qty < 1) return;

    const item = allItems.find((i) => i.id === itemId);
    if (item && qty > item.quantity) {
      alert(`Not enough stock! Only ${item.quantity} available.`);
      return;
    }

    setSelectedOrderItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantity: qty } : i))
    );
  };

  const removeItem = (itemId: number) => {
    setSelectedOrderItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const grandTotal = selectedOrderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const displayedOrders = orders
    .filter((order) => {
      const q = search.toLowerCase();
      return (
        order.customer.firstName.toLowerCase().includes(q) ||
        order.customer.tableNumber.toString().includes(q) ||
        order.id.toString().includes(q)
      ) && (statusFilter === "ALL" || order.status === statusFilter) && order.isActive;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case "date-desc": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "amount-desc": return b.totalAmount - a.totalAmount;
        case "amount-asc": return a.totalAmount - b.totalAmount;
        default: return 0;
      }
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) return <div className="py-10 text-center">Loading orders...</div>;
  if (error) return <div className="py-10 text-red-500 text-center">{error}</div>;

  return (
    <div className="py-10 px-4 space-y-4">

      {/* Unified Create / Edit Modal */}
      <CrudModal<CreateOrderForm>
        isOpen={showCreateModal}
        title={isEditing ? `Edit Order #${editingOrderId}` : "Take New Order"}
        onClose={() => {
          setShowCreateModal(false);
          setFormError("");
          setFormData({ tableNumber: "", firstName: "", pax: "", status: "PENDING" });
          setSelectedOrderItems([]);
          setItemSearch("");
          setIsEditing(false);
          setEditingOrderId(null);
        }}
        onConfirm={handleSaveOrder}
        loading={submitting}
        showForm
        formData={formData}
        setFormData={setFormData}
        formError={formError}
        formFields={[
          { key: "tableNumber", label: "Table Number", type: "number" },
          { key: "firstName", label: "Guest Name", type: "text" },
          { key: "pax", label: "Pax (optional)", type: "number" },
          {
            key: "status",
            label: "Initial Status",
            type: "select",
            options: ALL_STATUS_OPTIONS,
          },
        ]}
      >
        <div className="mt-6">
          <label className="font-roboto text-sm font-semibold mb-2 block">Add Items</label>

          <input
            type="text"
            placeholder="Search items..."
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="w-full mb-3 bg-[var(--color-bg-50)] font-roboto rounded-sm py-2 px-3 outline-none focus:ring-2 focus:ring-[var(--color-primary-600)] text-sm"
          />

          <div className="max-h-64 overflow-y-auto border border-[var(--color-bg-300)] rounded bg-white mb-6">
            {allItems
              .filter((item) => item.quantity > 0)
              .filter((item) => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
              .map((item) => (
                <div
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="px-4 py-3 hover:bg-[var(--color-bg-100)] cursor-pointer flex justify-between border-b last:border-none"
                >
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-[var(--color-text-500)]">
                      {item.sku || "—"} • Stock: {item.quantity}
                    </div>
                  </div>
                  <div className="font-semibold">₱{item.price}</div>
                </div>
              ))}
          </div>

          {selectedOrderItems.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Selected Items</h3>
              {selectedOrderItems.map((item) => (
                <div
                  key={item.itemId}
                  className="bg-[var(--color-bg-50)] p-3 rounded mb-2 flex items-center justify-between"
                >
                  <div className="font-medium flex-1">{item.name}</div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => changeQuantity(item.itemId, Number(e.target.value))}
                      className="w-16 text-center border rounded py-1"
                    />
                    <span className="font-semibold w-24 text-right">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeItem(item.itemId)}
                      className="text-red-600 text-2xl leading-none px-2 hover:bg-red-100 rounded"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>₱{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </CrudModal>

      {/* Quick Status Edit Modal */}
      <CrudModal
        isOpen={showEditModal}
        title={`Update Order #${editingOrder?.id}`}
        onClose={() => {
          setShowEditModal(false);
          setEditingOrder(null);
          setFormError("");
        }}
        onConfirm={handleUpdateStatus}
        loading={submitting}
        showForm
        formData={editFormData}
        setFormData={setEditFormData}
        formError={formError}
        formFields={[
          {
            key: "status",
            label: "New Status",
            type: "select",
            options: ALL_STATUS_OPTIONS,
          },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col justify-between items-center">
        <h1 className="font-bold text-2xl">Customer Orders</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by table, guest name or ID..."
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

      <PrimaryButton
        text="New Order"
        iconSrc="/add-icon.svg"
        onClick={() => openOrderModal()}
      />

      {/* Orders Display */}
      <div className="mt-4">
        {displayedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--color-text-800)]">
            <img src="/no-data-icon.svg" alt="No orders" className="size-16" />
            <p className="font-roboto font-semibold text-lg mt-4">No orders found</p>
          </div>
        )}

        {displayedOrders.length > 0 && (
          <>
            {/* Mobile Cards */}
            <div className="space-y-4 sm:hidden">
              {displayedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-[var(--color-bg-200)] rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-sm text-[var(--color-text-400)]">#{order.id}</div>
                      <div className="font-semibold text-lg mt-1">
                        Table {order.customer.tableNumber} — {order.customer.firstName}
                      </div>
                      {order.customer.pax && (
                        <div className="text-sm text-[var(--color-text-500)]">Pax: {order.customer.pax}</div>
                      )}
                    </div>
                    <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-between items-center">
                    <div>
                      <div className="text-xs text-[var(--color-text-500)]">Total</div>
                      <div className="font-semibold text-lg">₱{order.totalAmount.toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-[var(--color-text-500)]">
                      {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    {order.status !== "COMPLETED" && (
                      <button
                        onClick={() => openOrderModal(order)}
                        className="flex-1 py-2 text-sm border border-[var(--color-primary-600)] text-[var(--color-primary-600)] rounded-lg hover:bg-[var(--color-primary-50)]"
                      >
                        Edit Order
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="flex-1 py-2 text-sm border border-red-500 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto rounded-lg">
              <table className="min-w-full bg-white shadow-md table-auto border-collapse">
                <thead className="bg-[var(--color-primary-600)] text-white font-figtree">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold border-r w-16">#</th>
                    <th className="py-3 px-4 text-left font-bold border-r">Table / Guest</th>
                    <th className="py-3 px-4 text-left font-bold border-r w-20">Pax</th>
                    <th className="py-3 px-4 text-left font-bold border-r w-32">Status</th>
                    <th className="py-3 px-4 text-left font-bold border-r w-28">Total</th>
                    <th className="py-3 px-4 text-left font-bold border-r hidden md:table-cell">Date</th>
                    <th className="py-3 px-4 text-left font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-roboto divide-y divide-[var(--color-bg-100)]">
                  {displayedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[var(--color-bg-50)] transition-colors">
                      <td className="py-4 px-4 font-mono text-[var(--color-text-400)] border-r">#{order.id}</td>
                      <td className="py-4 px-4 text-[var(--color-text-900)] border-r">
                        Table {order.customer.tableNumber} — {order.customer.firstName}
                      </td>
                      <td className="py-4 px-4 text-center border-r">{order.customer.pax ?? "—"}</td>
                      <td className="py-4 px-4 border-r">
                        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-[var(--color-text-900)] border-r">
                        ₱{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-[var(--color-text-500)] border-r hidden md:table-cell whitespace-nowrap">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-4 px-4 flex gap-3">
                        {order.status !== "COMPLETED" && (
                          <img
                            src="/edit-icon.svg"
                            alt="Edit"
                            className="w-5 h-5 cursor-pointer hover:opacity-80"
                            onClick={() => openOrderModal(order)}
                          />
                        )}
                        <img
                          src="/delete-icon.svg"
                          alt="Delete"
                          className="w-5 h-5 cursor-pointer hover:opacity-80"
                          onClick={() => handleDelete(order.id)}
                        />
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

export default AdminOrders;