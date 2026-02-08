"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";

type Item = {
  itemId: string;
  name: string;
  sellingPrice: number;
};

type Bill = {
  id: string;
  customer?: string | null;
  totalAmount: number;
  createdAt: string;
};

type LineItem = {
  itemId: string;
  quantity: number;
  unitPrice: number;
};

export default function BillsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadItems = async () => {
    const data = await apiFetch<Item[]>("/items");
    setItems(data);
  };

  const loadBills = async () => {
    const data = await apiFetch<Bill[]>("/bills");
    setBills(data);
  };

  useEffect(() => {
    loadItems();
    loadBills();
  }, []);

  const addLine = () => {
    setLines([...lines, { itemId: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateLine = (index: number, update: Partial<LineItem>) => {
    const next = [...lines];
    next[index] = { ...next[index], ...update };
    setLines(next);
  };

  const handleSelectItem = (index: number, itemId: string) => {
    const item = items.find((entry) => entry.itemId === itemId);
    updateLine(index, {
      itemId,
      unitPrice: item ? item.sellingPrice : 0
    });
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleCreateBill = async () => {
    setStatus(null);
    try {
      const payload = {
        customer: customer.trim() || null,
        items: lines
          .filter((line) => line.itemId)
          .map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice)
          }))
      };

      if (payload.items.length === 0) {
        setStatus("Please add at least one item to the bill");
        return;
      }

      await apiFetch("/bills", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCustomer("");
      setLines([]);
      await loadBills();
      setStatus("Bill created successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to create bill");
    }
  };

  const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Create New Bill</h2>
            </div>
            <div className="form-group">
              <label className="form-label">Customer Name (optional)</label>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Enter customer name or leave empty for walk-in"
              />
            </div>

            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Line Items</h3>
                <button type="button" className="secondary" onClick={addLine}>
                  + Add Item
                </button>
              </div>

              {lines.map((line, index) => (
                <div key={index} className="card" style={{ marginBottom: "12px", padding: "16px", background: "var(--bg-secondary)" }}>
                  <div className="form-group">
                    <label className="form-label">Item</label>
                    <select value={line.itemId} onChange={(e) => handleSelectItem(index, e.target.value)}>
                      <option value="">Select item</option>
                      {items.map((item) => (
                        <option key={item.itemId} value={item.itemId}>
                          {item.name} ({item.itemId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Unit Price (KWD)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <button type="button" className="ghost danger" onClick={() => removeLine(index)} style={{ width: "100%", marginTop: "8px" }}>
                    Remove
                  </button>
                </div>
              ))}

              {lines.length === 0 && (
                <p className="notice">No items added yet. Click "Add Item" to start.</p>
              )}
            </div>

            {lines.length > 0 && (
              <div style={{ marginTop: "20px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Total Amount:</strong>
                  <strong style={{ fontSize: "20px", color: "var(--primary)" }}>{totalAmount.toFixed(3)} KWD</strong>
                </div>
              </div>
            )}

            <div style={{ marginTop: "20px" }}>
              <button onClick={handleCreateBill} disabled={lines.length === 0} style={{ width: "100%" }}>
                Create Bill
              </button>
            </div>

            {status && (
              <div className={status.includes("success") ? "alert success" : "alert error"} style={{ marginTop: "16px" }}>
                {status}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Bills</h2>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Customer</th>
                    <th>Total (KWD)</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.id.slice(0, 8)}...</td>
                      <td>{bill.customer || "Walk-in"}</td>
                      <td>{bill.totalAmount.toFixed(3)}</td>
                      <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td>
                        <a href={`/print/${bill.id}`} className="badge primary">
                          Print
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
