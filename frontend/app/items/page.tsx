"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

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
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleRestore = async (itemId: string) => {
    try {
      await apiFetch(`/items/${itemId}/restore`, { method: "POST" });
      await loadItems();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Restore failed");
    }
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 className="section-title">Item Editor</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Item ID</label>
            <input
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
              disabled={!!editingId}
            />
          </div>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Buying Price (optional)</label>
            <input
              type="number"
              step="0.001"
              value={form.buyingPrice}
              onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Selling Price (KWD)</label>
            <input
              type="number"
              step="0.001"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            />
          </div>
          <button type="submit">{editingId ? "Update" : "Create"} item</button>
          {editingId && (
            <button type="button" className="ghost" onClick={() => {
              setEditingId(null);
              setForm({ ...emptyForm });
            }}>
              Cancel
            </button>
          )}
          {status && <p className="notice">{status}</p>}
        </form>
      </section>

      <section className="card">
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
            />
            Show deleted items
          </label>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Name</th>
              <th>Selling (KWD)</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.itemId}>
                <td>{item.itemId}</td>
                <td>{item.name}</td>
                <td>{item.sellingPrice.toFixed(3)}</td>
                <td>{item.deletedAt ? "Deleted" : "Active"}</td>
                <td>
                  {!item.deletedAt ? (
                    <>
                      <button className="ghost" onClick={() => handleEdit(item)}>Edit</button>{" "}
                      <button className="danger" onClick={() => handleDelete(item.itemId)}>Delete</button>
                    </>
                  ) : (
                    <button className="secondary" onClick={() => handleRestore(item.itemId)}>Restore</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="notice">Deleted items can be restored within 24 hours before permanent removal.</p>
      </section>
    </div>
  );
}
