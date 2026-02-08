"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Icons } from "../../components/Icons";

type Item = {
  itemId: string;
  name: string;
  buyingPrice?: number | null;
  sellingPrice: number;
  deletedAt?: string | null;
};

const emptyForm = {
  itemId: "",
  name: "",
  buyingPrice: "",
  sellingPrice: ""
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      const data = await apiFetch<Item[]>(`/items?includeDeleted=${includeDeleted}`);
      setItems(data);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load items");
    }
  };

  useEffect(() => {
    loadItems();
  }, [includeDeleted]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    try {
      const payload = {
        itemId: form.itemId.trim(),
        name: form.name.trim(),
        buyingPrice: form.buyingPrice ? Number(form.buyingPrice) : null,
        sellingPrice: Number(form.sellingPrice)
      };

      if (editingId) {
        await apiFetch(`/items/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/items", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      await loadItems();
      setStatus(editingId ? "Item updated successfully" : "Item created successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.itemId);
    setForm({
      itemId: item.itemId,
      name: item.name,
      buyingPrice: item.buyingPrice?.toString() ?? "",
      sellingPrice: item.sellingPrice.toString()
    });
  };

  const handleDelete = async (itemId: string) => {
    try {
      await apiFetch(`/items/${itemId}`, { method: "DELETE" });
      await loadItems();
      setStatus("Item deleted successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      await apiFetch(`/items/${itemId}/restore`, { method: "POST" });
      await loadItems();
      setStatus("Item restored successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Restore failed");
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Icons.Package className="card-icon" />
                <h2 className="card-title">{editingId ? "Edit" : "Add"} Item</h2>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Item ID</label>
                <input
                  value={form.itemId}
                  onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                  disabled={!!editingId}
                  placeholder="e.g., ITEM001"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Item name"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Buying Price (optional, KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.buyingPrice}
                  onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
                  placeholder="0.000"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Selling Price (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  placeholder="0.000"
                  required
                />
              </div>
              <div className="btn-group">
                <button type="submit" className="btn btn-primary">
                  {editingId ? <Icons.Check className="btn-icon" /> : <Icons.Plus className="btn-icon" />}
                  <span>{editingId ? "Update" : "Create"} Item</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ ...emptyForm });
                    }}
                  >
                    <Icons.X className="btn-icon" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>
              {status && (
                <div className={status.includes("success") ? "alert success" : "alert error"}>
                  {status}
                </div>
              )}
            </form>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Icons.FileText className="card-icon" />
                <h2 className="card-title">Items List</h2>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                />
                <span>Show deleted</span>
              </label>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item ID</th>
                    <th>Name</th>
                    <th>Selling (KWD)</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.itemId}>
                      <td>{item.itemId}</td>
                      <td>{item.name}</td>
                      <td>{item.sellingPrice.toFixed(3)}</td>
                      <td>
                        {item.deletedAt ? (
                          <span className="badge danger">Deleted</span>
                        ) : (
                          <span className="badge success">Active</span>
                        )}
                      </td>
                      <td>
                        <div className="btn-group">
                          {!item.deletedAt ? (
                            <>
                              <button className="btn btn-sm btn-ghost" onClick={() => handleEdit(item)}>
                                <Icons.Edit className="btn-icon-sm" />
                                <span>Edit</span>
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.itemId)}>
                                <Icons.Trash className="btn-icon-sm" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-sm btn-success" onClick={() => handleRestore(item.itemId)}>
                              <Icons.RotateCcw className="btn-icon-sm" />
                              <span>Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="notice">Deleted items can be restored within 24 hours before permanent removal.</p>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
