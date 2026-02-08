"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Icons } from "../../components/Icons";

type Item = {
  itemId: string;
  name: string;
  arabicName: string;
  buyingPrice?: number | null;
  sellingPrice: number;
  unit: string;
  deletedAt?: string | null;
};

const emptyForm = {
  itemId: "",
  name: "",
  arabicName: "",
  buyingPrice: "",
  sellingPrice: "",
  unit: "pcs"
};

type TabType = "active" | "trash";

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [idCheckMessage, setIdCheckMessage] = useState<string | null>(null);
  const [idCheckKind, setIdCheckKind] = useState<"success" | "error" | null>(null);

  const activeItems = items.filter((item) => !item.deletedAt);
  const deletedItems = items.filter((item) => item.deletedAt);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Item[]>("/items?includeDeleted=true");
      setItems(data);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const isValidItemId = (value: string) => /^[A-Za-z0-9]+$/.test(value);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    const trimmedId = form.itemId.trim();
    const trimmedName = form.name.trim();
    const sellingValue = Number(form.sellingPrice);
    if (!editingId) {
      if (!trimmedId) {
        setStatus("Item ID is required");
        return;
      }
      if (trimmedId.length > 100) {
        setStatus("Item ID must be at most 100 characters");
        return;
      }
      if (!isValidItemId(trimmedId)) {
        setStatus("Item ID must contain only letters and numbers");
        return;
      }
    }
    if (!trimmedName) {
      setStatus("Item name is required");
      return;
    }
    if (!form.arabicName.trim()) {
      setStatus("Arabic name is required");
      return;
    }
    if (!Number.isFinite(sellingValue) || sellingValue <= 0) {
      setStatus("Selling price must be positive");
      return;
    }

    setLoading(true);
    
    try {
      const payload: {
        itemId?: string;
        name: string;
        arabicName: string;
        buyingPrice: number | null;
        sellingPrice: number;
        unit: string;
      } = {
        name: trimmedName,
        arabicName: form.arabicName.trim(),
        buyingPrice: form.buyingPrice ? Number(form.buyingPrice) : null,
        sellingPrice: sellingValue,
        unit: form.unit || "pcs"
      };

      if (editingId) {
        payload.itemId = form.itemId.trim();
        await apiFetch(`/items/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setStatus("Item updated successfully!");
      } else {
        payload.itemId = trimmedId;
        await apiFetch("/items", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setStatus("Item created successfully!");
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      setModalOpen(false);
      setIdCheckMessage(null);
      setIdCheckKind(null);
      await loadItems();
      
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.itemId);
    setForm({
      itemId: item.itemId,
      name: item.name,
      arabicName: item.arabicName || "",
      buyingPrice: item.buyingPrice?.toString() ?? "",
      sellingPrice: item.sellingPrice.toString(),
      unit: item.unit || "pcs"
    });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? It can be restored within 24 hours.")) {
      return;
    }
    
    setLoading(true);
    try {
      await apiFetch(`/items/${itemId}`, { method: "DELETE" });
      await loadItems();
      setStatus("Item moved to trash");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (itemId: string) => {
    setLoading(true);
    try {
      await apiFetch(`/items/${itemId}/restore`, { method: "POST" });
      await loadItems();
      setStatus("Item restored successfully!");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(false);
  };

  const handleVerifyId = async () => {
    const trimmedId = form.itemId.trim();
    if (!trimmedId) {
      setIdCheckMessage("Enter an Item ID to verify");
      setIdCheckKind("error");
      return;
    }
    if (trimmedId.length > 100) {
      setIdCheckMessage("Item ID must be at most 100 characters");
      setIdCheckKind("error");
      return;
    }
    if (!isValidItemId(trimmedId)) {
      setIdCheckMessage("Item ID must contain only letters and numbers");
      setIdCheckKind("error");
      return;
    }

    try {
      const item = await apiFetch<Item>(`/items/${encodeURIComponent(trimmedId)}`);
      if (editingId && item.itemId === editingId) {
        setIdCheckMessage("Item ID is valid");
        setIdCheckKind("success");
      } else {
        setIdCheckMessage(`Item exists with same id and ${item.name}.`);
        setIdCheckKind("error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("not found")) {
        setIdCheckMessage("Item ID is available");
        setIdCheckKind("success");
      } else {
        setIdCheckMessage(message || "Unable to verify Item ID");
        setIdCheckKind("error");
      }
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "var(--space-6)" }}>
          <div className="stat-card blue">
            <div className="stat-icon">
              <Icons.Package className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Active Items</div>
              <div className="stat-value">{activeItems.length}</div>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">
              <Icons.Trash className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">In Trash</div>
              <div className="stat-value">{deletedItems.length}</div>
            </div>
          </div>
        </div>

        {status && (
          <div className={`alert ${status.includes("success") || status.includes("restored") || status.includes("moved") ? "success" : "alert-error"}`} style={{ marginBottom: "var(--space-6)" }}>
            <Icons.Check className="alert-icon" />
            <span>{status}</span>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <Icons.Package className="card-icon" />
              <h2 className="card-title">Items</h2>
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddNew}>
              <Icons.Plus className="btn-icon-sm" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="items-toggle-row">
            <div className="segmented-toggle" role="tablist" aria-label="Item lists">
              <button
                type="button"
                className={activeTab === "active" ? "segmented-option active" : "segmented-option"}
                onClick={() => setActiveTab("active")}
                role="tab"
                aria-selected={activeTab === "active"}
              >
                <Icons.Package className="btn-icon-sm" />
                <span>Active Items</span>
                <span className="tab-badge">{activeItems.length}</span>
              </button>
              <button
                type="button"
                className={activeTab === "trash" ? "segmented-option active" : "segmented-option"}
                onClick={() => setActiveTab("trash")}
                role="tab"
                aria-selected={activeTab === "trash"}
              >
                <Icons.Trash className="btn-icon-sm" />
                <span>Trash Bin</span>
                {deletedItems.length > 0 && (
                  <span className="tab-badge danger">{deletedItems.length}</span>
                )}
              </button>
            </div>
          </div>

            {activeTab === "active" && (
              <>
                {loading ? (
                  <div className="empty-state">
                    <div className="spinner-large"></div>
                    <p>Loading items...</p>
                  </div>
                ) : activeItems.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Package className="empty-icon" />
                    <h3>No items yet</h3>
                    <p>Create your first item using the Add Item button</p>
                  </div>
                ) : (
                  <div className="table-container items-table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item ID</th>
                          <th>Name</th>
                          <th>Unit</th>
                          <th>Buying</th>
                          <th>Selling</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeItems.map((item) => (
                          <tr key={item.itemId}>
                            <td>
                              <span className="item-id">{item.itemId}</span>
                            </td>
                            <td>
                              <strong>{item.name}</strong>
                            </td>
                            <td>
                              <span className="badge">{item.unit}</span>
                            </td>
                            <td>
                              {item.buyingPrice ? (
                                <span className="price">{item.buyingPrice.toFixed(3)} KWD</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              <span className="price primary">{item.sellingPrice.toFixed(3)} KWD</span>
                            </td>
                            <td>
                              <div className="btn-group">
                                <button 
                                  className="btn btn-sm btn-ghost" 
                                  onClick={() => handleEdit(item)}
                                  disabled={loading}
                                >
                                  <Icons.Edit className="btn-icon-sm" />
                                  <span>Edit</span>
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={() => handleDelete(item.itemId)}
                                  disabled={loading}
                                >
                                  <Icons.Trash className="btn-icon-sm" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "trash" && (
              <>
                {loading ? (
                  <div className="empty-state">
                    <div className="spinner-large"></div>
                    <p>Loading trash...</p>
                  </div>
                ) : deletedItems.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Trash className="empty-icon" />
                    <h3>Trash is empty</h3>
                    <p>Deleted items will appear here for 24 hours before permanent removal</p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "var(--space-4) var(--space-6)", background: "var(--warning-bg)", borderBottom: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <Icons.AlertCircle style={{ width: "20px", height: "20px", color: "var(--warning)" }} />
                        <p style={{ fontSize: "13px", color: "var(--warning)", margin: 0 }}>
                          Items in trash will be permanently deleted after 24 hours
                        </p>
                      </div>
                    </div>
                    <div className="table-container items-table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item ID</th>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Selling Price</th>
                            <th>Deleted At</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedItems.map((item) => (
                            <tr key={item.itemId} style={{ opacity: 0.7 }}>
                              <td>
                                <span className="item-id">{item.itemId}</span>
                              </td>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td>
                                <span className="badge">{item.unit}</span>
                              </td>
                              <td>
                                <span className="price">{item.sellingPrice.toFixed(3)} KWD</span>
                              </td>
                              <td>
                                {item.deletedAt && new Date(item.deletedAt).toLocaleString()}
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-success" 
                                  onClick={() => handleRestore(item.itemId)}
                                  disabled={loading}
                                >
                                  <Icons.RotateCcw className="btn-icon-sm" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

        {modalOpen && (
          <div className="modal-backdrop" onClick={handleCloseModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div className="card-title-group">
                  <Icons.Package className="card-icon" />
                  <h2 className="card-title">{editingId ? "Edit Item" : "Add New Item"}</h2>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={handleCloseModal}>
                  <Icons.X className="btn-icon-sm" />
                </button>
              </div>

              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">
                      <Icons.FileText className="label-icon" />
                      <span>Item ID</span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        value={form.itemId}
                        maxLength={100}
                        onChange={(e) => {
                          setForm({ ...form, itemId: e.target.value });
                          setIdCheckMessage(null);
                          setIdCheckKind(null);
                        }}
                        placeholder="e.g., ABC123"
                        required
                      />
                      <button type="button" className="btn btn-sm btn-secondary" onClick={handleVerifyId}>
                        {editingId ? "Check" : "Verify"}
                      </button>
                    </div>
                    {idCheckMessage && (
                      <p className={`inline-notice ${idCheckKind === "success" ? "success" : "error"}`}>
                        {idCheckMessage}
                      </p>
                    )}
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      {editingId ? "Update the Item ID if needed" : "Up to 100 letters and numbers (no spaces)"}
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        <Icons.Package className="label-icon" />
                        <span>Item Name</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g., Coca Cola 330ml"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <Icons.Package className="label-icon" />
                        <span>Item Name (Arabic)</span>
                      </label>
                      <input
                        type="text"
                        value={form.arabicName || ""}
                        onChange={(e) => setForm({ ...form, arabicName: e.target.value })}
                        placeholder="مثال: كوكاكولا 330 مل"
                        dir="rtl"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icons.Package className="label-icon" />
                      <span>Unit Type</span>
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    >
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="box">Box</option>
                      <option value="carton">Carton</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="g">Gram (g)</option>
                      <option value="L">Liter (L)</option>
                      <option value="mL">Milliliter (mL)</option>
                      <option value="m">Meter (m)</option>
                      <option value="pack">Pack</option>
                      <option value="set">Set</option>
                      <option value="dozen">Dozen</option>
                    </select>
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      Select the unit of measurement for this item
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icons.DollarSign className="label-icon" />
                      <span>Buying Price (Optional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={form.buyingPrice || ""}
                      onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                      placeholder="0.000 KWD"
                    />
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      Leave empty if not applicable
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icons.TrendingUp className="label-icon" />
                      <span>Selling Price (Required)</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={form.sellingPrice || ""}
                      onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                      placeholder="0.000 KWD"
                      required
                    />
                  </div>

                  <div className="btn-group" style={{ marginTop: "var(--space-6)" }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                      {editingId ? <Icons.Check className="btn-icon" /> : <Icons.Plus className="btn-icon" />}
                      <span>{editingId ? "Update" : "Create"} Item</span>
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                      <Icons.X className="btn-icon" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
